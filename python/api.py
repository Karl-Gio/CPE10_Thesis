import cv2
import time
import threading
import os
import numpy as np
import requests
import joblib
import pandas as pd

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from datetime import datetime, timedelta, date 

from sensorReadings.arduino_reader import ArduinoReader

app = Flask(__name__)
CORS(app)

# ============================================
# CONFIG
# ============================================
W, H = 640, 480
CONFIDENCE_THRESHOLD = 0.45
SKIP_FRAMES = 3
DATASET_FOLDER = "CapturedImage"

if not os.path.exists(DATASET_FOLDER):
    os.makedirs(DATASET_FOLDER)

ARDUINO_PORT = "/dev/ttyACM0"
ARDUINO_BAUD = 115200

LARAVEL_API_URL = "http://127.0.0.1:8000/api/parameters"

# Auto inference schedule
INFERENCE_INTERVAL = 1800   # 30 minutes
INFERENCE_DURATION = 300    # 5 minutes

# ============================================
# WATERMARK SETTINGS (CCTV STYLE)
# ============================================
# PALITAN ITO: Ilagay dito kung kailan kayo nag-start magtanim (Year, Month, Day)
START_DATE = date(2026, 3, 27) 
LOCATION_TEXT_1 = "Cabuyao City, Laguna"
LOCATION_TEXT_2 = "Calabarzon"

# ============================================
# GLOBAL VARS
# ============================================
camera_active = False
is_processing = False
view_mode = "normal"

# Scheduler state
last_inference_end = time.time()
inference_start_time = None
manual_override = False

current_params = {
    "batch": "Batch A",
    "datePlanted": datetime.now().strftime("%Y-%m-%d"),
    "totalSeeds": 30,
    "programDays": 7,

    "ambientTemp": 25.0,
    "ambientHum": 70.0,
    "soilMoisture": 35.0,
    "soilTemp": 22.0,

    "uvStart24": "07:00",
    "uvDurationMinutes": 120,

    "ledStart24": "17:00",
    "ledEnd24": "06:00"
}

params_saved_once = False
last_command_sent = None
last_saved_payload = None
last_saved_at = None

latest_stats = {
    "temp": 0.0,
    "hum": 0.0,
    "lux": 0.0,
    "sMOIST": 0.0,
    "sTEMP": 0.0,
    "pechay_detected": 0,
    "pump": "OFF",
    "uv": "OFF",
    "ledw": "OFF",
    "tempMode": "IDLE",
    "humMode": "IDLE",
    "camera_active": False,
    "is_processing": False,
    "view_mode": "normal",
    "confidenceScore": 0,
    "last_saved_at": None,
    "mode": "IDLE",  # CAMERA_OFF | IDLE | RUNNING | MANUAL
    "next_inference_in_sec": 0,
    "remaining_inference_sec": 0,
    "manual_override": False
}

output_frame = None
lock = threading.Lock()

max_detected = 0

# ============================================
# LOAD MODEL
# ============================================
print("⏳ Loading YOLO Model...")
try:
    model = YOLO("imageProcessing/best.pt")
    print("✅ Model Loaded!")
except Exception as e:
    print(f"❌ Error loading YOLO model: {e}")
    model = None

# ============================================
# LOAD RANDOM FOREST MODEL
# ============================================
print("🧠 Loading Random Forest Model...")
try:
    ml_model = joblib.load('germination_model.pkl')
    print("✅ ML Model Loaded!")
except Exception as e:
    print(f"❌ Error loading ML model: {e}")
    ml_model = None

# Define the features exactly as they were in training
ML_FEATURES = [
    'Ambient Temperature', 'Ambient Humidity', 
    'Soil Temperature', 'Soil Moisture', 
    'Light Duration', 'Pechay Count'
]

# ============================================
# SENSOR INITIALIZATION
# ============================================
sensor = ArduinoReader(port=ARDUINO_PORT, baud=ARDUINO_BAUD)
sensor.start()

# ============================================
# HELPER FUNCTIONS
# ============================================
def safe_float(value, default=0.0):
    try:
        return float(value)
    except Exception:
        return default

def safe_int(value, default=0):
    try:
        return int(value)
    except Exception:
        return default

def is_within_program_window(date_planted_str, program_days, now=None):
    try:
        if now is None:
            now = datetime.now()

        planted_date = datetime.strptime(date_planted_str, "%Y-%m-%d").date()
        end_date = planted_date + timedelta(days=int(program_days))

        return planted_date <= now.date() < end_date
    except Exception as e:
        print(f"⚠️ Program window error: {e}")
        return False


def is_led_active(start_str, end_str, now=None):
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


def is_uv_active(start_str, duration_mins, now=None):
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


def build_command(params, now=None):
    if now is None:
        now = datetime.now()

    active_program = is_within_program_window(
        params.get("datePlanted", datetime.now().strftime("%Y-%m-%d")),
        params.get("programDays", 7),
        now
    )

    if not active_program:
        uv_on = 0
        led_on = 0
    else:
        uv_on = is_uv_active(
            params.get("uvStart24", "07:00"),
            params.get("uvDurationMinutes", 120),
            now
        )
        led_on = is_led_active(
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

def send_command_if_changed(force=False, reason=""):
    global last_command_sent, params_saved_once

    if not params_saved_once:
        return False

    now = datetime.now()
    command, uv_on, led_on = build_command(current_params, now)

    with lock:
        latest_stats["uv"] = "ON" if uv_on else "OFF"
        latest_stats["ledw"] = "ON" if led_on else "OFF"

    if not force and command == last_command_sent:
        return False

    print("====================================")
    print(f"🚀 Sending Hardware Command ({reason})")
    print(f"🕐 Time: {now.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"📦 Command: {command}")
    print("====================================")

    try:
        ok = sensor.send_command(command)
        if ok:
            last_command_sent = command
            return True
        else:
            print("❌ Failed to send command to Arduino")
            return False
    except Exception as e:
        print(f"❌ Exception sending command: {e}")
        return False

def build_laravel_payload():
    with lock:
        payload = {
            "Ambient_Temperature": safe_float(latest_stats.get("temp", 0.0)),
            "Relative_Humidity": safe_float(latest_stats.get("hum", 0.0)),
            "Soil_Temperature": safe_float(latest_stats.get("sTEMP", 0.0)),
            "Soil_Moisture": safe_float(latest_stats.get("sMOIST", 0.0)),
            "Light_Intensity": safe_float(latest_stats.get("lux", 0.0)),
            "Pechay_Count": safe_int(max_detected),
            "Batch": current_params.get("batch", "Batch A")
        }
    return payload

def save_to_laravel():
    global last_saved_payload, last_saved_at

    try:
        payload = build_laravel_payload()

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

        if last_saved_payload == payload:
            print("Skipping save: no changes")
            return False

        response = requests.post(
            LARAVEL_API_URL,
            json=payload,
            timeout=10
        )

        if response.ok:
            last_saved_payload = payload
            last_saved_at = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            with lock:
                latest_stats["last_saved_at"] = last_saved_at

            print("✅ Saved to Laravel:", payload)
            return True
        else:
            print(f"❌ Laravel save failed: {response.status_code} {response.text}")
            return False

    except Exception as e:
        print(f"❌ Error saving to Laravel: {e}")
        return False
    
def sync_params_from_laravel():
    global current_params, params_saved_once
    print("🔄 Syncing parameters from Laravel database...")
    try:
        response = requests.get("http://127.0.0.1:8000/api/configurations/active", timeout=5)
        if response.ok:
            data = response.json()
            
            # Get the raw values
            led_start = data.get("ledStart", "17:00")
            led_dur = safe_int(data.get("ledDuration", 360))

            # Logic: Calculate LED End Time so is_led_active() works correctly
            try:
                start_dt = datetime.strptime(led_start, "%H:%M")
                end_dt = start_dt + timedelta(minutes=led_dur)
                led_end_str = end_dt.strftime("%H:%M")
            except:
                led_end_str = "06:00"

            current_params.update({
                "batch": data.get("batch", "Batch A"),
                "datePlanted": data.get("datePlanted", datetime.now().strftime("%Y-%m-%d")),
                "ambientTemp": safe_float(data.get("ambientTemp")),
                "ambientHum": safe_float(data.get("ambientHum")),
                "soilMoisture": safe_float(data.get("soilMoisture")),
                "soilTemp": safe_float(data.get("soilTemp")),
                "uvStart24": data.get("uvStart", "07:00"),      
                "uvDurationMinutes": safe_int(data.get("uvDuration", 120)), 
                "ledStart24": led_start,
                "ledEnd24": led_end_str
            })
            params_saved_once = True
            print(f"✅ Sync Complete: Now monitoring {current_params['batch']}")
            send_command_if_changed(force=True, reason="initial sync")         
    except Exception as e:
        print(f"❌ Error syncing from Laravel: {e}")


def train_and_get_prediction(data_dict):
    if ml_model is None:
        print("⚠️ Prediction failed: Model not loaded. Returning default.")
        return 7.0

    try:
        # Prepare input data (Matching feature names and order)
        input_df = pd.DataFrame([[
            safe_float(data_dict.get('ambientTemp')),
            safe_float(data_dict.get('ambientHum')),
            safe_float(data_dict.get('soilTemp')),
            safe_float(data_dict.get('soilMoisture')),
            safe_float(data_dict.get('uvDuration')), # Using UV as light duration
            25 # Default Pechay Count for initial prediction
        ]], columns=ML_FEATURES)

        prediction = ml_model.predict(input_df)[0]
        return round(float(prediction), 2)
    except Exception as e:
        print(f"❌ Prediction error: {e}")
        return 7.0

# ============================================
# SCHEDULE MONITOR
# ============================================
def schedule_monitor():
    print("📅 Schedule Monitor Started - checking every 5 seconds")
    while True:
        try:
            if params_saved_once:
                send_command_if_changed(force=False, reason="schedule monitor")
        except Exception as e:
            print(f"⚠️ Schedule monitor error: {e}")
        time.sleep(5)

schedule_thread = threading.Thread(target=schedule_monitor, daemon=True)
schedule_thread.start()

# ============================================
# SENSOR THREAD
# ============================================
def update_sensors():
    global latest_stats
    print("📡 Sensor Thread Started...")

    while True:
        try:
            s_data = sensor.get_data()

            if s_data:
                with lock:
                    latest_stats["temp"] = s_data.get("temp", latest_stats["temp"])
                    latest_stats["hum"] = s_data.get("hum", latest_stats["hum"])
                    latest_stats["lux"] = s_data.get("lux", latest_stats["lux"])
                    latest_stats["sMOIST"] = s_data.get("sMOIST", latest_stats["sMOIST"])
                    latest_stats["sTEMP"] = s_data.get("sTEMP", latest_stats["sTEMP"])
                    latest_stats["pump"] = s_data.get("pump", latest_stats["pump"])
                    latest_stats["uv"] = s_data.get("uv", latest_stats["uv"])
                    latest_stats["ledw"] = s_data.get("ledw", latest_stats["ledw"])
                    latest_stats["tempMode"] = s_data.get("tempMode", latest_stats["tempMode"])
                    latest_stats["humMode"] = s_data.get("humMode", latest_stats["humMode"])
            else:
                pass # Silent ignore para hindi spam sa console
        except Exception as e:
            print(f"⚠️ Sensor update error: {e}")

        time.sleep(1)

sensor_t = threading.Thread(target=update_sensors, daemon=True)
sensor_t.start()

# ============================================
# CAMERA PROCESSING
# ============================================
def process_camera():
    global output_frame
    global latest_stats
    global camera_active
    global view_mode
    global is_processing
    global last_inference_end
    global inference_start_time
    global manual_override
    global max_detected

    cap = None
    frame_count = 0
    last_annotated_frame = None
    last_masked_frame = None

    while True:
        try:
            # CAMERA OFF
            if not camera_active:
                if cap is not None:
                    cap.release()
                    cap = None
                    print("📷 Camera released.")

                is_processing = False
                inference_start_time = None
                frame_count = 0
                last_annotated_frame = None
                last_masked_frame = None

                with lock:
                    output_frame = np.zeros((H, W, 3), dtype=np.uint8)
                    latest_stats["camera_active"] = False
                    latest_stats["is_processing"] = False
                    latest_stats["view_mode"] = view_mode
                    latest_stats["pechay_detected"] = 0
                    latest_stats["confidenceScore"] = 0
                    latest_stats["mode"] = "CAMERA_OFF"
                    latest_stats["next_inference_in_sec"] = INFERENCE_INTERVAL
                    latest_stats["remaining_inference_sec"] = 0
                    latest_stats["manual_override"] = manual_override

                time.sleep(0.2)
                continue

            # OPEN CAMERA
            if cap is None:
                print("🚀 Opening camera...")
                cap = cv2.VideoCapture(0)
                cap.set(3, W)
                cap.set(4, H)
                time.sleep(0.5)

                if not cap.isOpened():
                    print("⚠️ Camera not opened. Retrying...")
                    cap = None
                    time.sleep(1)
                    continue

            success, frame = cap.read()
            if not success:
                time.sleep(0.01)
                continue

            frame = cv2.flip(frame, 1)
            final_frame = frame.copy()
            current_time = time.time()

            # ============================================
            # AUTO SCHEDULER
            # ============================================
            if not manual_override:
                if (not is_processing) and ((current_time - last_inference_end) >= INFERENCE_INTERVAL):
                    print("🟢 Starting scheduled inference for 5 minutes...")
                    is_processing = True
                    inference_start_time = current_time
                    frame_count = 0
                    last_annotated_frame = None
                    last_masked_frame = None
                    max_detected = 0

                if is_processing and inference_start_time is not None:
                    if (current_time - inference_start_time) >= INFERENCE_DURATION:
                        print("🔴 Stopping scheduled inference.")
                        print("💾 Saving data after inference cycle...")
                        save_to_laravel()
                        
                        max_detected = 0
                        is_processing = False
                        inference_start_time = None
                        last_inference_end = current_time
                        frame_count = 0
                        last_annotated_frame = None
                        last_masked_frame = None

            # ============================================
            # DETECTION
            # ============================================
            if is_processing and model is not None:
                frame_count += 1

                if frame_count % SKIP_FRAMES == 0 or last_annotated_frame is None:
                    results = model.predict(
                        frame,
                        conf=CONFIDENCE_THRESHOLD,
                        verbose=False,
                        imgsz=320
                    )

                    count = len(results[0].boxes)
                    max_detected = max(max_detected, count)

                    current_conf = (
                        round((sum(box.conf.item() for box in results[0].boxes) / count) * 100, 1)
                        if count > 0 else 0
                    )

                    annotated_frame = frame.copy()
                    masked_frame = np.zeros_like(frame)

                    for result in results:
                        for box in result.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            x1, y1 = max(0, x1), max(0, y1)
                            x2, y2 = min(W, x2), min(H, y2)

                            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

                            try:
                                masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
                            except Exception:
                                pass

                    last_annotated_frame = annotated_frame
                    last_masked_frame = masked_frame

                    with lock:
                        latest_stats["pechay_detected"] = count
                        latest_stats["confidenceScore"] = current_conf
                else:
                    annotated_frame = last_annotated_frame if last_annotated_frame is not None else frame
                    masked_frame = last_masked_frame if last_masked_frame is not None else np.zeros_like(frame)

                final_frame = masked_frame if view_mode == "masked" else annotated_frame

            else:
                frame_count = 0
                final_frame = frame

          # ============================================
            # NEW: WATERMARK LOGIC (CCTV Style)
            # ============================================
            if final_frame is not None:
                now = datetime.now()
                current_date_str = now.strftime("%m-%d-%Y")
                current_time_str = now.strftime("%I:%M:%S %p")
                
                # Calculate "Day X"
                current_date = now.date()
                days_passed = (current_date - START_DATE).days
                day_text = f"Day {max(0, days_passed)}"
                
                # BAGO: Ginamit ang FONT_HERSHEY_PLAIN para mas malapit sa digital style
                font = cv2.FONT_HERSHEY_PLAIN
                # Medyo nilakihan kasi mas maliit naturally ang PLAIN font
                font_scale = 1.0  
                color = (255, 255, 255) # White text
                thickness = 1
                shadow_color = (0, 0, 0) # Black shadow
                
                # POSISYON: Lower Left Corner
                x_start = 50
                y_start = H - 120 
                # Binawasan ang spacing kasi mas condensed ang PLAIN font
                line_spacing = 18 
                
                lines = [
                    day_text,
                    current_date_str,
                    f"Time: {current_time_str}"
                ]
                
                for i, line in enumerate(lines):
                    y_pos = y_start + (i * line_spacing)
                    
                    # --- GUMAWA TAYO NG OUTLINE EFFECT ---
                    # Para makuha yung itim na border sa paligid ng puting text
                    cv2.putText(final_frame, line, (x_start + 1, y_pos), font, font_scale, shadow_color, thickness + 1)
                    cv2.putText(final_frame, line, (x_start - 1, y_pos), font, font_scale, shadow_color, thickness + 1)
                    cv2.putText(final_frame, line, (x_start, y_pos + 1), font, font_scale, shadow_color, thickness + 1)
                    cv2.putText(final_frame, line, (x_start, y_pos - 1), font, font_scale, shadow_color, thickness + 1)
                    
                    # Draw Real Text (Puti sa gitna)
                    cv2.putText(final_frame, line, (x_start, y_pos), font, font_scale, color, thickness)

            # ============================================
            # STATUS UPDATE
            # ============================================
            with lock:
                latest_stats["is_processing"] = is_processing
                latest_stats["camera_active"] = camera_active
                latest_stats["view_mode"] = view_mode
                latest_stats["manual_override"] = manual_override

                if not camera_active:
                    latest_stats["mode"] = "CAMERA_OFF"
                    latest_stats["next_inference_in_sec"] = INFERENCE_INTERVAL
                    latest_stats["remaining_inference_sec"] = 0
                elif manual_override:
                    latest_stats["mode"] = "MANUAL"
                    latest_stats["next_inference_in_sec"] = 0
                    latest_stats["remaining_inference_sec"] = 0
                elif is_processing and inference_start_time is not None:
                    latest_stats["mode"] = "RUNNING"
                    latest_stats["remaining_inference_sec"] = max(
                        0, int(INFERENCE_DURATION - (current_time - inference_start_time))
                    )
                    latest_stats["next_inference_in_sec"] = 0
                else:
                    latest_stats["mode"] = "IDLE"
                    latest_stats["remaining_inference_sec"] = 0
                    latest_stats["next_inference_in_sec"] = max(
                        0, int(INFERENCE_INTERVAL - (current_time - last_inference_end))
                    )

                output_frame = final_frame.copy()

        except Exception as e:
            print(f"⚠️ Camera thread error: {e}")
            time.sleep(0.2)

        time.sleep(0.005)

camera_thread = threading.Thread(target=process_camera, daemon=True)
camera_thread.start()



# ============================================
# FLASK ROUTES
# ============================================
@app.route("/video_feed")
def video_feed():
    def generate():
        while True:
            try:
                with lock:
                    if output_frame is None:
                        time.sleep(0.05)
                        continue

                    flag, encoded_image = cv2.imencode(
                        ".jpg",
                        output_frame,
                        [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                    )

                if not flag:
                    continue

                yield (
                    b"--frame\r\n"
                    b"Content-Type: image/jpeg\r\n\r\n" +
                    encoded_image.tobytes() +
                    b"\r\n"
                )

            except Exception as e:
                print(f"⚠️ Video feed error: {e}")

            time.sleep(0.03)

    return Response(generate(), mimetype="multipart/x-mixed-replace; boundary=frame")


@app.route("/status")
def get_status():
    with lock:
        return jsonify(dict(latest_stats))


@app.route("/toggle_inference", methods=["POST"])
def toggle_inference():
    global is_processing, manual_override, inference_start_time, last_inference_end, max_detected

    manual_override = True
    is_processing = not is_processing

    if is_processing:
        inference_start_time = time.time()
        max_detected = 0
        print("Manual inference started.")
    else:
        print("🔴 Manual inference stopped.")
        print("💾 Saving data after manual inference...")
        save_to_laravel()
        inference_start_time = None
        last_inference_end = time.time()
        max_detected = 0

    return jsonify({
        "status": is_processing,
        "manual_override": manual_override
    })


@app.route("/set_auto_mode", methods=["POST"])
def set_auto_mode():
    global manual_override, is_processing, inference_start_time, last_inference_end, max_detected

    manual_override = False
    is_processing = False
    inference_start_time = None
    last_inference_end = time.time()
    max_detected = 0

    print("🔄 Returned to AUTO mode.")

    return jsonify({
        "status": "auto_mode_enabled",
        "manual_override": manual_override
    })

@app.route("/toggle_camera", methods=["POST"])
def toggle_camera():
    global camera_active, is_processing, inference_start_time, manual_override, max_detected

    camera_active = not camera_active

    if not camera_active:
        is_processing = False
        inference_start_time = None
        manual_override = False
        max_detected = 0

    return jsonify({"status": camera_active})


@app.route("/toggle_view", methods=["POST"])
def toggle_view():
    global view_mode
    view_mode = "masked" if view_mode == "normal" else "normal"
    return jsonify({"status": "success", "mode": view_mode})


@app.route("/capture_image", methods=["POST"])
def capture_image():
    global output_frame

    if output_frame is None:
        return jsonify({"status": "error", "message": "No frame"}), 400

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = os.path.join(DATASET_FOLDER, f"img_{timestamp}.jpg")

    with lock:
        cv2.imwrite(filename, output_frame)

    return jsonify({"status": "success", "file": filename})


@app.route("/api/update_params", methods=["POST"])
def update_params():
    global current_params, params_saved_once

    try:
        # Get data from React (sanitizedValues)
        data = request.json if request.is_json else {}

        # 1. Map React keys to variables
        batch_name = data.get("batch", "Batch A")
        
        # Numbers
        amb_temp = safe_float(data.get("ambientTemp"), 25.0)
        amb_hum  = safe_float(data.get("ambientHum"), 70.0)
        s_moist  = safe_float(data.get("soilMoisture"), 35.0)
        s_temp   = safe_float(data.get("soilTemp"), 22.0)
        
        # Time and Durations
        uv_start = data.get("uvStart", "07:00")
        uv_dur   = safe_int(data.get("uvDuration"), 120)
        
        led_start = data.get("ledStart", "17:00")
        led_dur   = safe_int(data.get("ledDuration"), 360) # Minutes

        # 2. Logic: Calculate LED End Time
        # React sends 'ledDuration' in minutes. We turn it into an 'HH:MM' end string.
        try:
            start_dt = datetime.strptime(led_start, "%H:%M")
            end_dt = start_dt + timedelta(minutes=led_dur)
            led_end_str = end_dt.strftime("%H:%M")
        except Exception:
            led_end_str = "23:59" # Fallback

        # 3. Validation
        if uv_dur < 1 or uv_dur > 720:
            return jsonify({"status": "error", "message": "UV duration must be 1-720 mins."}), 400

        # 4. Update the global dictionary to match your existing logic
        current_params.update({
            "batch": batch_name,
            "ambientTemp": amb_temp,
            "ambientHum": amb_hum,
            "soilMoisture": s_moist,
            "soilTemp": s_temp,
            "uvStart24": uv_start,
            "uvDurationMinutes": uv_dur,
            "ledStart24": led_start,
            "ledEnd24": led_end_str, # Calculated for the Arduino command
            "ledDuration": led_dur    # Stored for UI reference
        })

        params_saved_once = True

        # 5. Trigger Hardware Sync
        # This sends the new <temp,hum,moist,temp,uv,led> command to Arduino
        sent = send_command_if_changed(force=True, reason="React UI Parameters Update")

        now = datetime.now()
        command, uv_on, led_on = build_command(current_params, now)

        return jsonify({
            "status": "success",
            "message": f"Parameters for {batch_name} updated!",
            "command": command,
            "uv": uv_on,
            "led": led_on,
            "sent_to_arduino": sent,
            "params": current_params # Send back to React to confirm
        })

    except Exception as e:
        print(f"❌ /api/update_params error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/api/current_params", methods=["GET"])
def get_current_params():
    now = datetime.now()
    command, uv_on, led_on = build_command(current_params, now)

    return jsonify({
        "saved_once": params_saved_once,
        "params": current_params,
        "uv": uv_on,
        "led": led_on,
        "activeProgram": is_within_program_window(
            current_params.get("datePlanted", datetime.now().strftime("%Y-%m-%d")),
            current_params.get("programDays", 7),
            now
        ),
        "command": command
    })


@app.route("/api/resend_params", methods=["POST"])
def resend_params():
    try:
        if not params_saved_once:
            return jsonify({
                "status": "error",
                "message": "No saved parameters yet."
            }), 400

        sent = send_command_if_changed(force=True, reason="manual resend")

        now = datetime.now()
        command, uv_on, led_on = build_command(current_params, now)

        return jsonify({
            "status": "success",
            "sent_to_arduino": sent,
            "command": command,
            "uv": uv_on,
            "led": led_on
        })

    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route("/api/predict", methods=["POST"])
def predict_germination():
    try:
        data = request.json
        predicted_days = train_and_get_prediction(data)
        
        return jsonify({
            "status": "success",
            "predicted_days": predicted_days
        })
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ============================================
# MAIN
# ============================================
if __name__ == "__main__":
    sync_params_from_laravel() 
    app.run(host="0.0.0.0", port=5000, threaded=True, debug=False)