import cv2
import time
import threading
import os
import numpy as np
import requests

from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from datetime import datetime, timedelta

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

ARDUINO_PORT = '/dev/ttyACM0'
ARDUINO_BAUD = 115200

LARAVEL_API_URL = "http://127.0.0.1:8000/api/parameters"
SAVE_INTERVAL_SECONDS = 60

# Inference schedule:
# wait 30 mins, run inference for 5 mins, repeat
INFERENCE_INTERVAL = 1800   # 30 minutes
INFERENCE_DURATION = 300    # 5 minutes

# ============================================
# GLOBAL VARS
# ============================================
camera_active = False
is_processing = False
view_mode = "normal"

# scheduler state
last_inference_end = time.time()
inference_start_time = None
manual_override = False   # if True, manual /toggle_inference controls processing

current_params = {
    "batch": "Batch A",
    "ambientTemp": 25.0,
    "ambientHum": 70.0,
    "soilMoisture": 35.0,
    "soilTemp": 22.0,
    "uvStart": "07:00",
    "uvDuration": 90,
    "ledStart": "18:00",
    "ledDuration": 360
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
    "mode": "IDLE",                    # CAMERA_OFF | IDLE | RUNNING | MANUAL
    "next_inference_in_sec": 0,
    "remaining_inference_sec": 0,
    "manual_override": False
}

output_frame = None
lock = threading.Lock()

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

def is_light_active(start_str, duration_mins, now=None):
    try:
        if now is None:
            now = datetime.now()

        start_time = datetime.strptime(start_str, "%H:%M").time()
        start_dt = datetime.combine(now.date(), start_time)
        end_dt = start_dt + timedelta(minutes=int(duration_mins))

        return 1 if start_dt <= now <= end_dt else 0
    except Exception:
        return 0

def build_command(params, now=None):
    if now is None:
        now = datetime.now()

    uv_on = is_light_active(params["uvStart"], params["uvDuration"], now)
    led_on = is_light_active(params["ledStart"], params["ledDuration"], now)

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
        print(f"ℹ️ Command unchanged, not sending. Reason: {reason}")
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
            "Pechay_Count": safe_int(latest_stats.get("pechay_detected", 0)),
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
            return

        if last_saved_payload == payload:
            print("Skipping save: no changes")
            return

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

            print("Saved to Laravel:", payload)
        else:
            print(f"Laravel save failed: {response.status_code} {response.text}")

    except Exception as e:
        print(f"Error saving to Laravel: {e}")

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
                print("⚠️ No data received from ArduinoReader thread.")

        except Exception as e:
            print(f"⚠️ Sensor update error: {e}")

        time.sleep(1)

sensor_t = threading.Thread(target=update_sensors, daemon=True)
sensor_t.start()

# ============================================
# DATABASE LOGGER THREAD
# ============================================
def database_logger():
    print(f"💾 Database Logger Started - saving every {SAVE_INTERVAL_SECONDS} seconds")
    while True:
        try:
            save_to_laravel()
        except Exception as e:
            print(f"⚠️ Database logger error: {e}")

        time.sleep(SAVE_INTERVAL_SECONDS)

db_logger_thread = threading.Thread(target=database_logger, daemon=True)
db_logger_thread.start()

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
                if not is_processing and (current_time - last_inference_end >= INFERENCE_INTERVAL):
                    print("🟢 Starting scheduled inference for 5 minutes...")
                    is_processing = True
                    inference_start_time = current_time
                    frame_count = 0
                    last_annotated_frame = None
                    last_masked_frame = None

                if is_processing and inference_start_time is not None:
                    if current_time - inference_start_time >= INFERENCE_DURATION:
                        print("🔴 Stopping scheduled inference.")
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
                    results = model.predict(frame, conf=CONFIDENCE_THRESHOLD, verbose=False, imgsz=320)
                    count = len(results[0].boxes)

                    current_conf = (
                        round((sum([box.conf.item() for box in results[0].boxes]) / count * 100), 1)
                        if count > 0 else 0
                    )

                    annotated_frame = frame.copy()
                    masked_frame = np.zeros_like(frame)

                    for result in results:
                        for box in result.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])

                            x1 = max(0, x1)
                            y1 = max(0, y1)
                            x2 = min(W, x2)
                            y2 = min(H, y2)

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
@app.route('/video_feed')
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
                    b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' +
                    encoded_image.tobytes() +
                    b'\r\n'
                )

            except Exception as e:
                print(f"⚠️ Video feed error: {e}")

            time.sleep(0.03)

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def get_status():
    with lock:
        return jsonify(dict(latest_stats))

@app.route('/toggle_inference', methods=['POST'])
def toggle_inference():
    global is_processing, manual_override, inference_start_time, last_inference_end

    # Manual button takes over from auto schedule
    manual_override = True
    is_processing = not is_processing

    if is_processing:
        inference_start_time = time.time()
        print("🟢 Manual inference started.")
    else:
        inference_start_time = None
        last_inference_end = time.time()
        print("🔴 Manual inference stopped.")

    return jsonify({
        "status": is_processing,
        "manual_override": manual_override
    })

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    global camera_active, is_processing, inference_start_time, manual_override

    camera_active = not camera_active

    if not camera_active:
        is_processing = False
        inference_start_time = None
        manual_override = False

    return jsonify({"status": camera_active})

@app.route('/api/update_params', methods=['POST'])
def update_params():
    global current_params, params_saved_once

    try:
        data = request.json if request.is_json else {}

        new_params = {
            "batch": data.get('batch', "Batch A"),
            "ambientTemp": safe_float(data.get('ambientTemp', 25.0), 25.0),
            "ambientHum": safe_float(data.get('ambientHum', 70.0), 70.0),
            "soilMoisture": safe_float(data.get('soilMoisture', 35.0), 35.0),
            "soilTemp": safe_float(data.get('soilTemp', 22.0), 22.0),
            "uvStart": data.get('uvStart', "07:00"),
            "uvDuration": safe_int(data.get('uvDuration', 90), 90),
            "ledStart": data.get('ledStart', "18:00"),
            "ledDuration": safe_int(data.get('ledDuration', 360), 360)
        }

        current_params = new_params
        params_saved_once = True

        sent = send_command_if_changed(force=True, reason="user saved parameters")

        now = datetime.now()
        command, uv_on, led_on = build_command(current_params, now)

        return jsonify({
            "status": "success",
            "message": "Parameters saved and processed",
            "command": command,
            "uv": uv_on,
            "led": led_on,
            "sent_to_arduino": sent,
            "params": current_params
        })

    except Exception as e:
        print(f"❌ /api/update_params error: {e}")
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/current_params', methods=['GET'])
def get_current_params():
    return jsonify({
        "saved_once": params_saved_once,
        "params": current_params
    })

@app.route('/api/resend_params', methods=['POST'])
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

# ============================================
# MAIN
# ============================================
if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)