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
                "Ambient_Temperature": self.safe_float(self.latest_stats.get("temp", 0.0)),
                "Relative_Humidity": self.safe_float(self.latest_stats.get("hum", 0.0)),
                "Soil_Temperature": self.safe_float(self.latest_stats.get("sTEMP", 0.0)),
                "Soil_Moisture": self.safe_float(self.latest_stats.get("sMOIST", 0.0)),
                "Light_Intensity": self.safe_float(self.latest_stats.get("lux", 0.0)),
                "Pechay_Count": self.safe_int(self.max_detected),
                "Batch": self.current_params.get("batch", "Batch A")
            }
        return payload

    def save_to_laravel(self):
        try:
            payload = self.build_laravel_payload()

            all_zero = all([
                payload["Ambient_Temperature"] == 0,
                payload["Relative_Humidity"] == 0,
                payload["Soil_Temperature"] == 0,
                payload["Soil_Moisture"] == 0,
                payload["Light_Intensity"] == 0,
                payload["Pechay_Count"] == 0
            ])

            if all_zero:
                print("Skipping save: ALL values are 0")
                return False

            if self.last_saved_payload == payload:
                print("Skipping save: no changes")
                return False

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

            print(f"❌ Laravel save failed: {response.status_code} {response.text}")
            return False

        except Exception as e:
            print(f"❌ Error saving to Laravel: {e}")
            return False

    def build_testing_payload(self, session_data):
        with self.lock:
            payload = {
                "batch": str(session_data.get("batch", "Batch A")).strip(),

                # targets from React
                "ambient_temp_target": self.safe_float(session_data.get("ambient_temp")),
                "ambient_humidity_target": self.safe_float(session_data.get("ambient_humidity")),
                "soil_moisture_target": self.safe_float(session_data.get("soil_moisture")),
                "soil_temp_target": self.safe_float(session_data.get("soil_temp")),
                "uv": self.safe_int(session_data.get("uv")),
                "led": self.safe_int(session_data.get("led")),
                "duration": self.safe_int(session_data.get("duration"), 30),

                # actual live readings from Arduino/sensors
                "ambient_temp_actual": self.safe_float(self.latest_stats.get("temp", 0.0)),
                "ambient_humidity_actual": self.safe_float(self.latest_stats.get("hum", 0.0)),
                "soil_temp_actual": self.safe_float(self.latest_stats.get("sTEMP", 0.0)),
                "soil_moisture_actual": self.safe_float(self.latest_stats.get("sMOIST", 0.0)),
                "light_intensity": self.safe_float(self.latest_stats.get("lux", 0.0)),
                "pump": self.latest_stats.get("pump", 0),

                "recorded_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            }

        return payload

    def save_testing_log_to_laravel(self, payload):
        try:
            response = requests.post(TESTING_VALUES_API_URL, json=payload, timeout=10)

            if response.ok:
                print("✅ Testing log saved to Laravel:", payload)
                return True

            print(f"❌ Testing log save failed: {response.status_code} {response.text}")
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
            print(f"⏱ Duration: {duration_minutes} minute(s)")
            print(f"📡 Logging interval: {interval_seconds} second(s) (~30 logs total)")
            print(f"🕐 Start: {self.testing_started_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print(f"🕐 End:   {self.testing_ends_at.strftime('%Y-%m-%d %H:%M:%S')}")
            print("====================================")

            while self.testing_active and datetime.now() < self.testing_ends_at:
                try:
                    payload = self.build_testing_payload(session_data)
                    self.save_testing_log_to_laravel(payload)
                except Exception as e:
                    print(f"⚠️ Testing session loop error: {e}")

                slept = 0
                while self.testing_active and slept < interval_seconds:
                    if datetime.now() >= self.testing_ends_at:
                        break
                    time.sleep(1)
                    slept += 1

            print("🛑 Testing session finished.")

        except Exception as e:
            print(f"❌ Testing session worker failed: {e}")

        finally:
            self.testing_active = False
            self.testing_thread = None

            with self.lock:
                self.latest_stats["testing_active"] = False
                self.latest_stats["mode"] = "IDLE"

            self.testing_started_at = None
            self.testing_ends_at = None

    def start_testing_session(self, data):
        try:
            if self.testing_active:
                return {
                    "status": "error",
                    "message": "A testing session is already running."
                }, 400

            batch = str(data.get("batch", "Batch A")).strip()
            duration = self.safe_int(data.get("duration"), 30)

            if duration < 1:
                return {
                    "status": "error",
                    "message": "Duration must be at least 1 minute."
                }, 400

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

    def save_actual_germination_date(self, _unused=None):
        try:
            payload = {
                "germinated": True
            }

            response = requests.patch(
                LARAVEL_UPDATE_GERMINATION_DATE_URL,
                json=payload,
                timeout=10
            )

            if response.ok:
                print("✅ Germination confirmed and saved by Laravel")
                return True

            print(f"❌ Failed to save germination date: {response.status_code} {response.text}")
            return False

        except Exception as e:
            print(f"❌ Error saving actual germination date: {e}")
            return False

    def sync_params_from_laravel(self):
        print("🔄 Syncing parameters from Laravel database...")

        try:
            response = requests.get(ACTIVE_CONFIG_URL, timeout=5)
            if response.ok:
                data = response.json()

                led_start = data.get("ledStart", "17:00")
                led_dur = self.safe_int(data.get("ledDuration", 360))

                try:
                    start_dt = datetime.strptime(led_start, "%H:%M")
                    end_dt = start_dt + timedelta(minutes=led_dur)
                    led_end_str = end_dt.strftime("%H:%M")
                except Exception:
                    led_end_str = "06:00"

                self.current_params.update({
                    "batch": data.get("batch", "Batch A"),
                    "datePlanted": data.get("datePlanted", datetime.now().strftime("%Y-%m-%d")),
                    "ambientTemp": self.safe_float(data.get("ambientTemp")),
                    "ambientHum": self.safe_float(data.get("ambientHum")),
                    "soilMoisture": self.safe_float(data.get("soilMoisture")),
                    "soilTemp": self.safe_float(data.get("soilTemp")),
                    "uvStart24": data.get("uvStart", "07:00"),
                    "uvDurationMinutes": self.safe_int(data.get("uvDuration", 120)),
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
                if self.params_saved_once:
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
            self.is_processing = False
            self.inference_start_time = None
            self.max_detected = 0
            self.germination_confirm_counter = 0
            self.manual_override = True

            ok = self.sensor.send_command("SEQ_SHUTDOWN")

            if not ok:
                return {
                    "status": "error",
                    "message": "Failed to send SEQ_SHUTDOWN to Arduino."
                }, 500

            with self.lock:
                self.latest_stats["manual_override"] = True
                self.latest_stats["mode"] = "MANUAL"
                self.latest_stats["germination_confirm_counter"] = 0

            return {
                "status": "success",
                "message": "Sequential shutdown command sent.",
                "command": "SEQ_SHUTDOWN"
            }, 200

        except Exception as e:
            print(f"❌ /api/sequential_shutdown error: {e}")
            return {
                "status": "error",
                "message": str(e)
            }, 500

    def hardware_auto(self):
        try:
            ok = self.sensor.send_command("AUTO")
            if not ok:
                return {
                    "status": "error",
                    "message": "Failed to send AUTO to Arduino."
                }, 500

            self.manual_override = False

            with self.lock:
                self.latest_stats["manual_override"] = False
                self.latest_stats["mode"] = "IDLE"

            return {
                "status": "success",
                "message": "Arduino returned to AUTO mode.",
                "command": "AUTO"
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