import os
import cv2
import time
import joblib
import threading
import pandas as pd
import requests

from datetime import datetime, timedelta
from ultralytics import YOLO

from config import (
    DATASET_FOLDER,
    ARDUINO_PORT,
    ARDUINO_BAUD,
    LARAVEL_API_URL,
    ACTIVE_CONFIG_URL,
    BATCHES_API_BASE,
    DEFAULT_PARAMS,
    DEFAULT_STATS,
    TESTING_VALUES_API_URL,
    LARAVEL_UPDATE_GERMINATION_DATE_URL,
)
from sensorReadings.arduino_reader import ArduinoReader
from .camera_service import CameraService


class SystemService:
    def __init__(self):
        self.lock = threading.Lock()

        self.system_shutdown = False

        self.camera_active = False
        self.is_processing = False
        self.view_mode = "normal"

        self.last_inference_end = time.time()
        self.inference_start_time = None
        self.manual_override = False

        self.current_params = DEFAULT_PARAMS.copy()
        self.params_saved_once = False
        self.last_command_sent = None
        self.last_saved_payload = None
        self.last_saved_at = None

        self.testing_active = False
        self.testing_thread = None
        self.testing_started_at = None
        self.testing_ends_at = None
        self.testing_interval_seconds = 60

        self.latest_stats = DEFAULT_STATS.copy()

        self.output_frame = None
        self.max_detected = 0

        self.germination_saved_for_batch = {}
        self.germination_confirm_counter = 0

        self.sensor = None
        self.model = None
        self.ml_model = None
        self.ML_FEATURES = []

        os.makedirs(DATASET_FOLDER, exist_ok=True)

        self._load_models()
        self._init_sensor()

        self.camera_service = CameraService(self)

    # ============================================
    # INIT
    # ============================================
    def _load_models(self):
        print("⏳ Loading YOLO Model...")
        try:
            self.model = YOLO("imageProcessing/best.pt")
            self.latest_stats["model_loaded"] = True
            print("✅ Model Loaded!")
        except Exception as e:
            print(f"❌ Error loading YOLO model: {e}")
            self.model = None
            self.latest_stats["model_loaded"] = False

        print("🧠 Loading Random Forest Model...")
        try:
            saved_ml = joblib.load("germination_model.pkl")
            self.ml_model = saved_ml["model"]
            self.ML_FEATURES = saved_ml["features"]
            print("✅ ML Model Loaded!")
            print("📌 Features:", self.ML_FEATURES)
        except Exception as e:
            print(f"❌ Error loading ML model: {e}")
            self.ml_model = None
            self.ML_FEATURES = []

    def _init_sensor(self):
        self.sensor = ArduinoReader(port=ARDUINO_PORT, baud=ARDUINO_BAUD)
        self.sensor.start()

    def start_background_threads(self):
        threading.Thread(target=self.schedule_monitor_loop, daemon=True).start()
        threading.Thread(target=self.update_sensors_loop, daemon=True).start()
        threading.Thread(target=self.camera_service.process_camera_loop, daemon=True).start()

    # ============================================
    # HELPERS
    # ============================================
    @staticmethod
    def safe_float(value, default=0.0):
        try:
            return float(value)
        except Exception:
            return default

    @staticmethod
    def safe_int(value, default=0):
        try:
            return int(value)
        except Exception:
            return default

    def is_within_program_window(self, date_planted_str, program_days, now=None):
        try:
            if now is None:
                now = datetime.now()

            planted_date = datetime.strptime(date_planted_str, "%Y-%m-%d").date()
            end_date = planted_date + timedelta(days=int(program_days))
            return planted_date <= now.date() < end_date
        except Exception as e:
            print(f"⚠️ Program window error: {e}")
            return False

    def is_led_active(self, start_str, end_str, now=None):
        try:
            if now is None:
                now = datetime.now()

            start_time = datetime.strptime(str(start_str)[:5], "%H:%M").time()
            end_time = datetime.strptime(str(end_str)[:5], "%H:%M").time()

            start_dt = datetime.combine(now.date(), start_time)
            end_dt = datetime.combine(now.date(), end_time)

            if end_dt <= start_dt:
                end_dt += timedelta(days=1)
                if now < start_dt:
                    now = now + timedelta(days=1)

            return 1 if start_dt <= now <= end_dt else 0

        except Exception as e:
            print(f"⚠️ LED schedule error: {e} | start={start_str} end={end_str}")
            return 0

    def is_uv_active(self, start_str, duration_mins, now=None):
        try:
            if now is None:
                now = datetime.now()

            start_time = datetime.strptime(str(start_str)[:5], "%H:%M").time()
            start_dt = datetime.combine(now.date(), start_time)
            end_dt = start_dt + timedelta(minutes=int(duration_mins))

            return 1 if start_dt <= now <= end_dt else 0

        except Exception as e:
            print(f"⚠️ UV schedule error: {e} | start={start_str} duration={duration_mins}")
            return 0

    def build_command(self, params=None, now=None):
        if params is None:
            params = self.current_params

        if now is None:
            now = datetime.now()

        active_program = self.is_within_program_window(
            params.get("datePlanted", datetime.now().strftime("%Y-%m-%d")),
            params.get("programDays", 7),
            now
        )

        if not active_program:
            uv_on = 0
            led_on = 0
        else:
            uv_on = self.is_uv_active(
                params.get("uvStart24", "07:00"),
                params.get("uvDurationMinutes", 120),
                now
            )
            led_on = self.is_led_active(
                params.get("ledStart24", "17:00"),
                params.get("ledEnd24", "06:00"),
                now
            )

        command = (
            f"<{params['ambientTemp']},"
            f"{params['ambientHum']},"
            f"{params['soilMoisture']},"
            f"{params['soilTemp']},"
            f"{uv_on},"
            f"{led_on}>"
        )

        return command, uv_on, led_on

    def send_command_if_changed(self, force=False, reason=""):
        if not self.params_saved_once:
            return False

        if getattr(self, "system_shutdown", False) and reason != "hardware auto resume":
            print("⛔ Command send skipped: system is shutdown")
            return False

        now = datetime.now()
        command, uv_on, led_on = self.build_command(self.current_params, now)

        with self.lock:
            self.latest_stats["uv"] = "ON" if uv_on else "OFF"
            self.latest_stats["ledw"] = "ON" if led_on else "OFF"

        if not force and command == self.last_command_sent:
            return False

        print("====================================")
        print(f"🚀 Sending Hardware Command ({reason})")
        print(f"🕐 Time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"📦 Command: {command}")
        print("====================================")

        try:
            ok = self.sensor.send_command(command)
            if ok:
                self.last_command_sent = command
                return True

            print("❌ Failed to send command to Arduino")
            return False
        except Exception as e:
            print(f"❌ Exception sending command: {e}")
            return False
    
    def build_laravel_payload(self):
        with self.lock:
            payload = {
                "batch_id": self.safe_int(self.current_params.get("batch_id")),
                "ambient_temp": self.safe_float(self.latest_stats.get("temp", 0.0)),
                "humidity": self.safe_float(self.latest_stats.get("hum", 0.0)),
                "soil_temp": self.safe_float(self.latest_stats.get("sTEMP", 0.0)),
                "soil_moisture": self.safe_float(self.latest_stats.get("sMOIST", 0.0)),
                "light_intensity": self.safe_float(self.latest_stats.get("lux", 0.0)),
                "pechay_count": self.safe_int(self.max_detected),
            }
        return payload

    def save_to_laravel(self):
        try:
            # stop saving when system is shutdown
            if getattr(self, "system_shutdown", False):
                print("⛔ Skipping save: system is shutdown")
                return False

            # optional: also skip during testing if you want testing logs separate only
            if self.testing_active:
                print("⛔ Skipping normal Laravel save: testing session is active")
                return False

            payload = self.build_laravel_payload()

            all_zero = all([
                payload["ambient_temp"] == 0,
                payload["humidity"] == 0,
                payload["soil_temp"] == 0,
                payload["soil_moisture"] == 0,
                payload["light_intensity"] == 0,
                payload["pechay_count"] == 0
            ])

            if all_zero:
                print("⛔ Skipping save: ALL values are 0")
                return False

            if self.last_saved_payload == payload:
                print("⛔ Skipping save: no changes")
                return False

            print("📦 Laravel payload:", payload)

            response = requests.post(
                LARAVEL_API_URL,
                json=payload,
                timeout=10
            )

            if response.ok:
                self.last_saved_payload = payload
                self.last_saved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

                with self.lock:
                    self.latest_stats["last_saved_at"] = self.last_saved_at

                print("✅ Saved to Laravel:", payload)
                return True

            print(f"❌ Laravel save failed: {response.status_code} {response.text[:300]}")
            return False

        except Exception as e:
            print(f"❌ Error saving to Laravel: {e}")
            return False

    def build_testing_payload(self, session_data):
        with self.lock:
            payload = {
                "testing_parameter_id": self.safe_int(session_data.get("testing_parameter_id")),

                "ambient_temp_actual": self.safe_float(self.latest_stats.get("temp", 0.0)),
                "humidity_actual": self.safe_float(self.latest_stats.get("hum", 0.0)),
                "soil_temp_actual": self.safe_float(self.latest_stats.get("sTEMP", 0.0)),
                "soil_moisture_actual": self.safe_float(self.latest_stats.get("sMOIST", 0.0)),
                "light_intensity": self.safe_float(self.latest_stats.get("lux", 0.0)),

                "recorded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }

        return payload
    
    def save_testing_log_to_laravel(self, payload):
        try:
            if getattr(self, "system_shutdown", False):
                print("⛔ Testing log skipped: system is shutdown")
                return False

            response = requests.post(
                TESTING_VALUES_API_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=10
            )

            if response.ok:
                print("✅ Testing log saved to Laravel:", payload)
                return True

            try:
                print(f"❌ Testing log save failed: {response.status_code} | {response.json()}")
            except Exception:
                print(f"❌ Testing log save failed: {response.status_code} | {response.text[:300]}")

            return False

        except Exception as e:
            print(f"❌ Error saving testing log to Laravel: {e}")
            return False

    def _testing_session_worker(self, session_data):
        try:
            duration_minutes = self.safe_int(session_data.get("duration"), 30)
            if duration_minutes < 1:
                duration_minutes = 30

            batch = str(session_data.get("batch", "Batch A")).strip()

            raw_interval = (duration_minutes * 60) // 30
            interval_seconds = max(5, int(round(raw_interval / 5) * 5))
            self.testing_interval_seconds = interval_seconds

            self.testing_started_at = datetime.now()
            self.testing_ends_at = self.testing_started_at + timedelta(minutes=duration_minutes)
            self.testing_active = True

            with self.lock:
                self.latest_stats["mode"] = "TESTING"
                self.latest_stats["testing_active"] = True
                self.latest_stats["testing_batch"] = batch
                self.latest_stats["testing_started_at"] = self.testing_started_at.strftime("%Y-%m-%d %H:%M:%S")
                self.latest_stats["testing_ends_at"] = self.testing_ends_at.strftime("%Y-%m-%d %H:%M:%S")
                self.latest_stats["testing_interval_seconds"] = interval_seconds

            print("====================================")
            print("🧪 TESTING SESSION STARTED")
            print(f"📦 Batch: {batch}")
            print(f"🆔 Testing Parameter ID: {session_data.get('testing_parameter_id')}")
            print(f"⏱ Duration: {duration_minutes} minute(s)")
            print(f"📡 Logging interval: {interval_seconds} second(s) (~30 logs total)")
            print(f"🕐 Start: {self.testing_started_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"🕐 End:   {self.testing_ends_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print("====================================")

            while (
                self.testing_active
                and not getattr(self, "system_shutdown", False)
                and datetime.now() < self.testing_ends_at
            ):
                try:
                    payload = self.build_testing_payload(session_data)
                    self.save_testing_log_to_laravel(payload)
                except Exception as e:
                    print(f"⚠️ Testing session loop error: {e}")

                slept = 0
                while (
                    self.testing_active
                    and not getattr(self, "system_shutdown", False)
                    and slept < interval_seconds
                ):
                    if datetime.now() >= self.testing_ends_at:
                        break
                    time.sleep(1)
                    slept += 1

            if getattr(self, "system_shutdown", False):
                print("⛔ Testing session stopped because system is shutdown.")
            else:
                print("🛑 Testing session finished.")

        except Exception as e:
            print(f"❌ Testing session worker failed: {e}")

        finally:
            self.testing_active = False
            self.testing_thread = None

            with self.lock:
                self.latest_stats["testing_active"] = False
                self.latest_stats["mode"] = "SHUTDOWN" if getattr(self, "system_shutdown", False) else "MANUAL"

            self.testing_started_at = None
            self.testing_ends_at = None

            try:
                print("🚦 Sending SEQ_SHUTDOWN after testing finished...")
                ok = self.sensor.send_command("SEQ_SHUTDOWN")

                if ok:
                    print("✅ SEQ_SHUTDOWN sent successfully.")
                else:
                    print("❌ Failed to send SEQ_SHUTDOWN.")
            except Exception as e:
                print(f"❌ Error sending SEQ_SHUTDOWN after testing: {e}")

    def start_testing_session(self, data):
        try:
            if self.testing_active:
                return {
                    "status": "error",
                    "message": "A testing session is already running."
                }, 400

            testing_parameter_id = self.safe_int(data.get("testing_parameter_id"))
            if testing_parameter_id < 1:
                return {
                    "status": "error",
                    "message": "testing_parameter_id is required."
                }, 400

            batch = str(data.get("batch", "Batch A")).strip()
            duration = self.safe_int(data.get("duration"), 30)

            if duration < 1:
                return {
                    "status": "error",
                    "message": "Duration must be at least 1 minute."
                }, 400

            ambient_temp = self.safe_float(data.get("ambient_temp"))
            ambient_hum = self.safe_float(data.get("humidity"))
            soil_moisture = self.safe_float(data.get("soil_moisture"))
            soil_temp = self.safe_float(data.get("soil_temp"))
            uv = self.safe_int(data.get("uv"))
            led = self.safe_int(data.get("led"))

            command = (
                f"<{ambient_temp},"
                f"{ambient_hum},"
                f"{soil_moisture},"
                f"{soil_temp},"
                f"{uv},"
                f"{led}>"
            )

            ok = self.sensor.send_command(command)
            if not ok:
                return {
                    "status": "error",
                    "message": "Failed to send initial testing command to Arduino."
                }, 500

            self.testing_thread = threading.Thread(
                target=self._testing_session_worker,
                args=(data,),
                daemon=True
            )
            self.testing_thread.start()

            return {
                "status": "success",
                "message": f"Testing session started for {duration} minute(s).",
                "batch": batch,
                "duration": duration,
                "command_sent": command
            }, 200

        except Exception as e:
            print(f"❌ start_testing_session error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def stop_testing_session(self):
        try:
            if not self.testing_active:
                return {
                    "status": "error",
                    "message": "No active testing session."
                }, 400

            self.testing_active = False

            # optional shutdown command
            self.sensor.send_command("SEQ_SHUTDOWN")

            with self.lock:
                self.latest_stats["testing_active"] = False
                self.latest_stats["mode"] = "MANUAL"

            return {
                "status": "success",
                "message": "Testing session stopped."
            }, 200

        except Exception as e:
            print(f"❌ stop_testing_session error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def get_testing_status(self):
        return {
            "testing_active": self.testing_active,
            "testing_started_at": self.testing_started_at.strftime("%Y-%m-%d %H:%M:%S") if self.testing_started_at else None,
            "testing_ends_at": self.testing_ends_at.strftime("%Y-%m-%d %H:%M:%S") if self.testing_ends_at else None,
            "interval_seconds": self.testing_interval_seconds
        }

    def save_actual_germination_date(self, batch_name=None):
        try:
            current_batch = str(batch_name or self.current_params.get("batch", "Batch A")).strip()
            batch_id = self.safe_int(self.current_params.get("batch_id"))

            # Stop repeat attempts for this batch if already handled
            if self.germination_saved_for_batch.get(current_batch, False):
                return True

            payload = {
                "batch_id": batch_id, 
                "germinated": True
            }

            response = requests.patch(
                LARAVEL_UPDATE_GERMINATION_DATE_URL,
                json=payload,
                headers={
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=10
            )

            if response.ok:
                with self.lock:
                    self.germination_saved_for_batch[current_batch] = True
                    self.latest_stats["germination_saved"] = True

                print(f"✅ Germination confirmed and saved once for {current_batch}")
                return True

            print(f"❌ Failed to save germination date: {response.status_code} {response.text[:300]}")
            return False

        except Exception as e:
            print(f"❌ Error saving actual germination date: {e}")
            return False

    def handle_germination_detected(self, batch_name=None):
        try:
            current_batch = str(batch_name or self.current_params.get("batch", "Batch A")).strip()

            # already handled for this batch
            if self.germination_saved_for_batch.get(current_batch, False):
                print(f"ℹ️ Germination already handled for {current_batch}")
                return {
                    "status": "success",
                    "message": f"Germination already handled for {current_batch}.",
                    "batch": current_batch,
                    "already_handled": True
                }, 200

            print("====================================")
            print("🌱 GERMINATION DETECTED EARLY")
            print(f"📦 Batch: {current_batch}")
            print("💾 Saving final data before shutdown...")
            print("====================================")

            # stop inference immediately
            self.is_processing = False
            self.inference_start_time = None
            self.last_inference_end = time.time()
            self.manual_override = True

            with self.lock:
                self.latest_stats["is_processing"] = False
                self.latest_stats["manual_override"] = True
                self.latest_stats["mode"] = "GERMINATED"

            # save final normal snapshot BEFORE shutdown
            final_save_ok = self.save_to_laravel()

            # save germination event/date BEFORE shutdown
            germination_save_ok = self.save_actual_germination_date(current_batch)

            print(f"📌 final_save_ok = {final_save_ok}")
            print(f"📌 germination_save_ok = {germination_save_ok}")

            # reset counters after handling
            self.max_detected = 0
            self.germination_confirm_counter = 0

            with self.lock:
                self.latest_stats["germination_confirm_counter"] = 0
                self.latest_stats["germination_saved"] = self.germination_saved_for_batch.get(current_batch, False)

            # shutdown only AFTER saves
            shutdown_response, shutdown_status = self.sequential_shutdown()

            return {
                "status": "success" if (final_save_ok or germination_save_ok) else "error",
                "message": "Germination handled. Final data saved before shutdown.",
                "batch": current_batch,
                "final_save_ok": final_save_ok,
                "germination_save_ok": germination_save_ok,
                "shutdown_status": shutdown_status,
                "shutdown_response": shutdown_response
            }, 200 if (final_save_ok or germination_save_ok) else 500

        except Exception as e:
            print(f"❌ handle_germination_detected error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def sync_params_from_laravel(self):
        print("🔄 Syncing parameters from Laravel database...")

        try:
            response = requests.get(ACTIVE_CONFIG_URL, timeout=5)
            if response.ok:
                data = response.json()
                print("🔍 ACTIVE CONFIG DATA:", data)

                led_start = data.get("led_start", "17:00")
                led_dur = self.safe_int(data.get("led_duration", 360))
                uv_start = data.get("uv_start", "07:00")
                uv_dur = self.safe_int(data.get("uv_duration", 120))

                try:
                    start_dt = datetime.strptime(led_start, "%H:%M")
                    end_dt = start_dt + timedelta(minutes=led_dur)
                    led_end_str = end_dt.strftime("%H:%M")
                except Exception:
                    led_end_str = "06:00"

                self.current_params.update({
                    "batch_id": data.get("batch_id"),
                    "batch": data.get("batch", "Batch A"),
                    "datePlanted": data.get("date_planted", datetime.now().strftime("%Y-%m-%d")),
                    "ambientTemp": self.safe_float(data.get("ambient_temp")),
                    "ambientHum": self.safe_float(data.get("humidity")),
                    "soilMoisture": self.safe_float(data.get("soil_moisture")),
                    "soilTemp": self.safe_float(data.get("soil_temp")),
                    "uvStart24": uv_start,
                    "uvDurationMinutes": uv_dur,
                    "ledStart24": led_start,
                    "ledEnd24": led_end_str,
                    "ledDuration": led_dur
                })

                self.params_saved_once = True
                print(f"✅ Sync Complete: Now monitoring {self.current_params['batch']}")
                self.send_command_if_changed(force=True, reason="initial sync")

        except Exception as e:
            print(f"❌ Error syncing from Laravel: {e}")

    def predict_germination_days(self, data_dict):
        if self.ml_model is None:
            print("⚠️ Prediction failed: Model not loaded. Returning default.")
            return 7.0

        try:
            input_df = pd.DataFrame([{
                "Ambient Temperature": self.safe_float(data_dict.get("ambientTemp")),
                "Ambient Humidity": self.safe_float(data_dict.get("ambientHum")),
                "Soil Temperature": self.safe_float(data_dict.get("soilTemp")),
                "Soil Moisture": self.safe_float(data_dict.get("soilMoisture")),
                "Light Duration": self.safe_float(data_dict.get("uvDuration"))
            }])[self.ML_FEATURES]

            print("🔎 Prediction input:", input_df.to_dict(orient="records")[0])
            prediction = self.ml_model.predict(input_df)[0]
            return round(float(prediction), 2)

        except Exception as e:
            print(f"❌ Prediction error: {e}")
            return 7.0

    # ============================================
    # THREADS
    # ============================================
    def schedule_monitor_loop(self):
        print("📅 Schedule Monitor Started - checking every 5 seconds")
        while True:
            try:
                if not self.system_shutdown and self.params_saved_once:
                    self.send_command_if_changed(force=False, reason="schedule monitor")
            except Exception as e:
                print(f"⚠️ Schedule monitor error: {e}")
            time.sleep(5)

    def update_sensors_loop(self):
        print("📡 Sensor Thread Started...")

        while True:
            try:
                s_data = self.sensor.get_data()

                if s_data:
                    with self.lock:
                        self.latest_stats["temp"] = s_data.get("temp", self.latest_stats["temp"])
                        self.latest_stats["hum"] = s_data.get("hum", self.latest_stats["hum"])
                        self.latest_stats["lux"] = s_data.get("lux", self.latest_stats["lux"])
                        self.latest_stats["sMOIST"] = s_data.get("sMOIST", self.latest_stats["sMOIST"])
                        self.latest_stats["sTEMP"] = s_data.get("sTEMP", self.latest_stats["sTEMP"])
                        self.latest_stats["pump"] = s_data.get("pump", self.latest_stats["pump"])
                        self.latest_stats["uv"] = s_data.get("uv", self.latest_stats["uv"])
                        self.latest_stats["ledw"] = s_data.get("ledw", self.latest_stats["ledw"])
                        self.latest_stats["tempMode"] = s_data.get("tempMode", self.latest_stats["tempMode"])
                        self.latest_stats["humMode"] = s_data.get("humMode", self.latest_stats["humMode"])

            except Exception as e:
                print(f"⚠️ Sensor update error: {e}")

            time.sleep(1)

    # ============================================
    # ROUTE ACTIONS
    # ============================================
    def get_status(self):
        with self.lock:
            return dict(self.latest_stats)

    def toggle_inference(self):
        if not self.camera_active:
            return {
                "status": "error",
                "message": "Camera is OFF. Turn on camera first."
            }, 400

        if self.model is None:
            return {
                "status": "error",
                "message": "YOLO model not loaded."
            }, 500

        self.manual_override = True
        self.is_processing = not self.is_processing

        if self.is_processing:
            self.inference_start_time = time.time()
            self.max_detected = 0
            self.germination_confirm_counter = 0
            print("Manual inference started.")
        else:
            print("🔴 Manual inference stopped.")
            print("💾 Saving data after manual inference...")
            self.save_to_laravel()
            self.inference_start_time = None
            self.last_inference_end = time.time()
            self.max_detected = 0
            self.germination_confirm_counter = 0

        with self.lock:
            self.latest_stats["manual_override"] = self.manual_override
            self.latest_stats["is_processing"] = self.is_processing
            self.latest_stats["germination_confirm_counter"] = self.germination_confirm_counter

        return {
            "status": self.is_processing,
            "manual_override": self.manual_override
        }, 200

    def set_auto_mode(self):
        self.manual_override = False
        self.is_processing = False
        self.inference_start_time = None
        self.last_inference_end = time.time()
        self.max_detected = 0
        self.germination_confirm_counter = 0

        with self.lock:
            self.latest_stats["manual_override"] = False
            self.latest_stats["mode"] = "IDLE"
            self.latest_stats["germination_confirm_counter"] = 0

        print("🔄 Returned to AUTO mode.")

        return {
            "status": "auto_mode_enabled",
            "manual_override": self.manual_override
        }

    def toggle_camera(self):
        self.camera_active = not self.camera_active

        if not self.camera_active:
            self.is_processing = False
            self.inference_start_time = None
            self.manual_override = False
            self.max_detected = 0
            self.germination_confirm_counter = 0

            with self.lock:
                self.latest_stats["germination_confirm_counter"] = 0
                self.latest_stats["pechay_detected"] = 0
                self.latest_stats["confidenceScore"] = 0
                self.latest_stats["is_processing"] = False
                self.latest_stats["camera_active"] = False
                self.latest_stats["mode"] = "CAMERA_OFF"
                self.latest_stats["remaining_inference_sec"] = 0

        else:
            with self.lock:
                self.latest_stats["camera_active"] = True
                self.latest_stats["mode"] = "IDLE"

        print(f"Camera toggled: {self.camera_active}")
        return {"status": self.camera_active}
    
    def toggle_view(self):
        self.view_mode = "masked" if self.view_mode == "normal" else "normal"
        return {"status": "success", "mode": self.view_mode}

    def capture_image(self):
        if self.output_frame is None:
            return {"status": "error", "message": "No frame"}, 400

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = os.path.join(DATASET_FOLDER, f"img_{timestamp}.jpg")

        with self.lock:
            cv2.imwrite(filename, self.output_frame)

        return {"status": "success", "file": filename}, 200

    def update_params(self, data):
        try:
            old_batch = str(self.current_params.get("batch", "Batch A")).strip()
            batch_name = str(data.get("batch", "Batch A")).strip()

            amb_temp = self.safe_float(data.get("ambientTemp"), 25.0)
            amb_hum = self.safe_float(data.get("ambientHum"), 70.0)
            s_moist = self.safe_float(data.get("soilMoisture"), 35.0)
            s_temp = self.safe_float(data.get("soilTemp"), 22.0)

            uv_start = data.get("uvStart", "07:00")
            uv_dur = self.safe_int(data.get("uvDuration"), 120)

            led_start = data.get("ledStart", "17:00")
            led_dur = self.safe_int(data.get("ledDuration"), 360)

            try:
                start_dt = datetime.strptime(led_start, "%H:%M")
                end_dt = start_dt + timedelta(minutes=led_dur)
                led_end_str = end_dt.strftime("%H:%M")
            except Exception:
                led_end_str = "23:59"

            if uv_dur < 1 or uv_dur > 720:
                return {
                    "status": "error",
                    "message": "UV duration must be 1-720 mins."
                }, 400

            batch_changed = (old_batch != batch_name)

            if batch_changed:
                with self.lock:
                    self.germination_confirm_counter = 0
                print(f"🔄 Batch changed: {old_batch} -> {batch_name}")

            if batch_name not in self.germination_saved_for_batch:
                self.germination_saved_for_batch[batch_name] = False

            self.current_params.update({
                "batch_id": data.get("batch_id"),
                "batch": batch_name,
                "ambientTemp": amb_temp,
                "ambientHum": amb_hum,
                "soilMoisture": s_moist,
                "soilTemp": s_temp,
                "uvStart24": uv_start,
                "uvDurationMinutes": uv_dur,
                "ledStart24": led_start,
                "ledEnd24": led_end_str,
                "ledDuration": led_dur
            })

            self.params_saved_once = True

            sent = self.send_command_if_changed(force=True, reason="React UI Parameters Update")

            now = datetime.now()
            command, uv_on, led_on = self.build_command(self.current_params, now)

            return {
                "status": "success",
                "message": f"Parameters for {batch_name} updated!",
                "batch_changed": batch_changed,
                "command": command,
                "uv": uv_on,
                "led": led_on,
                "sent_to_arduino": sent,
                "germination_saved_for_batch": self.germination_saved_for_batch.get(batch_name, False),
                "params": self.current_params
            }, 200

        except Exception as e:
            print(f"❌ /api/update_params error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def testing_command(self, data):
        try:
            ambient_temp = self.safe_float(data.get("ambient_temp"))
            ambient_hum = self.safe_float(data.get("ambient_humidity"))
            soil_moisture = self.safe_float(data.get("soil_moisture"))
            soil_temp = self.safe_float(data.get("soil_temp"))
            uv = self.safe_int(data.get("uv"))
            led = self.safe_int(data.get("led"))

            command = (
                f"<{ambient_temp},"
                f"{ambient_hum},"
                f"{soil_moisture},"
                f"{soil_temp},"
                f"{uv},"
                f"{led}>"
            )

            if not command:
                return {
                    "status": "error",
                    "message": "No command provided"
                }, 400

            print("====================================")
            print("🧪 TESTING MODE COMMAND RECEIVED")
            print(f"📦 Command: {command}")
            print("====================================")

            ok = self.sensor.send_command(command)

            if not ok:
                return {
                    "status": "error",
                    "message": "Failed to send to Arduino"
                }, 500

            with self.lock:
                self.latest_stats["mode"] = "TESTING"

            return {
                "status": "success",
                "command": command,
                "sent": True
            }, 200

        except Exception as e:
            print(f"❌ testing_command error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def sequential_shutdown(self):
        try:
            print("🛑 SYSTEM-WIDE SEQUENTIAL SHUTDOWN INITIATED")

            self.system_shutdown = True

            # stop everything
            self.testing_active = False
            self.camera_active = False
            self.is_processing = False
            self.inference_start_time = None
            self.max_detected = 0
            self.germination_confirm_counter = 0
            self.manual_override = True

            ok = self.sensor.send_command("SEQ_SHUTDOWN")

            if not ok:
                return {"status": "error"}, 500

            with self.lock:
                self.latest_stats["mode"] = "SHUTDOWN"

            print("✅ Shutdown done. Will auto-resume in 1 sec...")

            # 🔥 AUTO UNLOCK TIMER
            threading.Thread(target=self._auto_resume_after_shutdown, daemon=True).start()

            return {"status": "success"}, 200

        except Exception as e:
            print(e)
            return {"status": "error"}, 500
        
    def _auto_resume_after_shutdown(self):
        time.sleep(1)  # ⏱ wait 1 second

        print("🔄 Auto-resuming system...")

        # call your existing recovery
        self.hardware_auto()

    def hardware_auto(self):
        try:
            print("🔄 Returning system to AUTO mode...")

            ok = self.sensor.send_command("AUTO")
            if not ok:
                return {
                    "status": "error",
                    "message": "Failed to send AUTO to Arduino."
                }, 500

            # only reopen system after Arduino accepts AUTO
            self.system_shutdown = False

            self.manual_override = False
            self.testing_active = False
            self.is_processing = False
            self.inference_start_time = None
            self.max_detected = 0
            self.germination_confirm_counter = 0

            with self.lock:
                self.latest_stats["manual_override"] = False
                self.latest_stats["testing_active"] = False
                self.latest_stats["is_processing"] = False
                self.latest_stats["camera_active"] = self.camera_active
                self.latest_stats["mode"] = "IDLE"
                self.latest_stats["germination_confirm_counter"] = 0

            if self.params_saved_once:
                self.send_command_if_changed(force=True, reason="hardware auto resume")

            return {
                "status": "success",
                "message": "System returned to AUTO mode.",
                "command": "AUTO",
                "system_shutdown": False
            }, 200

        except Exception as e:
            print(f"❌ /api/hardware_auto error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def manual_hardware(self, data):
        try:
            uv = self.safe_int(data.get("uv"))
            led = self.safe_int(data.get("led"))
            peltier = self.safe_int(data.get("peltier"))
            heater = self.safe_int(data.get("heater"))
            intake_fan = self.safe_int(data.get("intakeFan"))
            exhaust_fan = self.safe_int(data.get("exhaustFan"))
            buzzer = self.safe_int(data.get("buzzer"))
            pump = self.safe_int(data.get("pump"))

            command = (
                f"T<{uv},"
                f"{led},"
                f"{peltier},"
                f"{heater},"
                f"{intake_fan},"
                f"{exhaust_fan},"
                f"{buzzer},"
                f"{pump}>"
            )

            print("====================================")
            print("🎛 MANUAL HARDWARE COMMAND RECEIVED")
            print(f"📦 Command: {command}")
            print("====================================")

            ok = self.sensor.send_command(command)

            if not ok:
                return {
                    "status": "error",
                    "message": "Failed to send manual hardware command to Arduino."
                }, 500

            with self.lock:
                self.latest_stats["mode"] = "MANUAL"
                self.latest_stats["uv"] = "ON" if uv else "OFF"
                self.latest_stats["ledw"] = "ON" if led else "OFF"
                self.latest_stats["pump"] = "ON" if pump else "OFF"

            return {
                "status": "success",
                "message": "Manual hardware command sent successfully.",
                "command": command,
                "sent": True
            }, 200

        except Exception as e:
            print(f"❌ manual_hardware error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def get_current_params(self):
        now = datetime.now()
        command, uv_on, led_on = self.build_command(self.current_params, now)

        return {
            "saved_once": self.params_saved_once,
            "params": self.current_params,
            "uv": uv_on,
            "led": led_on,
            "activeProgram": self.is_within_program_window(
                self.current_params.get("datePlanted", datetime.now().strftime("%Y-%m-%d")),
                self.current_params.get("programDays", 7),
                now
            ),
            "command": command
        }

    def resend_params(self):
        try:
            if not self.params_saved_once:
                return {
                    "status": "error",
                    "message": "No saved parameters yet."
                }, 400

            sent = self.send_command_if_changed(force=True, reason="manual resend")
            now = datetime.now()
            command, uv_on, led_on = self.build_command(self.current_params, now)

            return {
                "status": "success",
                "sent_to_arduino": sent,
                "command": command,
                "uv": uv_on,
                "led": led_on
            }, 200

        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def predict(self, data):
        try:
            predicted_days = self.predict_germination_days(data)
            return {
                "status": "success",
                "predicted_days": predicted_days
            }, 200
        except Exception as e:
            return {
                "status": "error",
                "message": str(e)
            }, 500