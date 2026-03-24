import cv2
import time
import threading
import os
import datetime
import numpy as np
from flask import Flask, Response, jsonify, request
from flask_cors import CORS
from ultralytics import YOLO
from datetime import datetime, timedelta

# Import mula sa iyong arduino_reader file
from sensorReadings.arduino_reader import ArduinoReader

app = Flask(__name__)
CORS(app)

# --- CONFIG ---
W, H = 640, 480
CONFIDENCE_THRESHOLD = 0.45 
SKIP_FRAMES = 3             
DATASET_FOLDER = "CapturedImage"

if not os.path.exists(DATASET_FOLDER):
    os.makedirs(DATASET_FOLDER)

# --- GLOBAL VARS ---
camera_active = False 
is_processing = False
view_mode = "normal" 

# 1. UPDATED DICTIONARY:
latest_stats = {
    "temp": 0.0,      # Ambient Temp (Small letters)
    "hum": 0.0,       # Ambient Hum (Small letters)
    "lux": 0.0,       # Light Intensity
    "sMOIST": 0.0,    # Soil Moisture (ALL CAPS 'MOIST')
    "sTEMP": 0.0,     # Soil Temp (ALL CAPS 'TEMP')
    "pechay_detected": 0,
    "pump": "OFF",
    "uv": "OFF",
    "ledw": "OFF"
}

output_frame = None
lock = threading.Lock()

# --- LOAD MODEL ---
print("⏳ Loading YOLO Model...")
try:
    model = YOLO("imageProcessing/best.pt") 
    print("✅ Model Loaded!")
except Exception as e:
    print(f"❌ Error: {e}")
    model = None

# --- SENSOR INITIALIZATION ---
sensor = ArduinoReader(port='/dev/arduino', baud=115200)
sensor.start()

# 2. SEPARATE SENSOR THREAD: Para mag-update ang dashboard kahit off ang camera
def update_sensors():
    global latest_stats
    print("📡 Sensor Thread Started...")
    while True:
        s_data = sensor.get_data() 
        if s_data:
            # TINGNAN MO ITO SA TERMINAL:
            # Kung puro 0.0 ang nakikita mo dito, ang problema ay Python-to-Arduino
            print(f"DEBUG: Data from Arduino -> {s_data}") 
            
            with lock:
                latest_stats["temp"] = s_data.get("temp", latest_stats["temp"])
                latest_stats["hum"] = s_data.get("hum", latest_stats["hum"])
                latest_stats["lux"] = s_data.get("lux", latest_stats["lux"])
                latest_stats["sMOIST"] = s_data.get("sMOIST", latest_stats["sMOIST"])
                latest_stats["sTEMP"] = s_data.get("sTEMP", latest_stats["sTEMP"])
                latest_stats["pump"] = s_data.get("pump", latest_stats["pump"])
        else:
            print("⚠️ No data received from ArduinoReader thread.")
            
        time.sleep(1)

sensor_t = threading.Thread(target=update_sensors, daemon=True)
sensor_t.start()

def process_camera():
    global output_frame, latest_stats, camera_active, view_mode, is_processing
    cap = None 
    frame_count = 0
    last_annotated_frame = None 
    last_masked_frame = None

    while True:
        if not camera_active:
            if cap is not None:
                cap.release()
                cap = None
                with lock:
                    output_frame = np.zeros((H, W, 3), dtype=np.uint8)
            time.sleep(0.2)
            continue

        if cap is None:
            cap = cv2.VideoCapture(0)
            cap.set(3, W)
            cap.set(4, H)
            time.sleep(0.5)
            if not cap.isOpened():
                cap = None 
                time.sleep(1) 
                continue

        success, frame = cap.read()
        if not success:
            time.sleep(0.01)
            continue

        frame = cv2.flip(frame, 1)
        final_frame = frame.copy()
        
        if is_processing and model is not None:
            frame_count += 1
            if frame_count % SKIP_FRAMES == 0 or last_annotated_frame is None:
                results = model.predict(frame, conf=CONFIDENCE_THRESHOLD, verbose=False, imgsz=320)
                count = len(results[0].boxes)
                current_conf = round((sum([box.conf.item() for box in results[0].boxes]) / count * 100), 1) if count > 0 else 0 
                
                annotated_frame = frame.copy()          
                masked_frame = np.zeros_like(frame)     
                for result in results:
                    for box in result.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
                
                last_annotated_frame, last_masked_frame = annotated_frame, masked_frame
                latest_stats["pechay_detected"], latest_stats["confidenceScore"] = count, current_conf
            else:
                annotated_frame, masked_frame = last_annotated_frame, last_masked_frame

            final_frame = masked_frame if view_mode == "masked" else annotated_frame 
        else:
            frame_count = 0
            latest_stats["pechay_detected"], latest_stats["confidenceScore"] = 0, 0
            final_frame = frame

        latest_stats["is_processing"], latest_stats["camera_active"], latest_stats["view_mode"] = is_processing, camera_active, view_mode
        with lock: output_frame = final_frame.copy()
        time.sleep(0.005)

t = threading.Thread(target=process_camera, daemon=True)
t.start()

# --- ROUTES ---

@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            with lock:
                if output_frame is None:
                    time.sleep(0.05)
                    continue
                (flag, encodedImage) = cv2.imencode(".jpg", output_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if not flag: continue
            yield (b'--frame\r\nContent-Type: image/jpeg\r\n\r\n' + encodedImage.tobytes() + b'\r\n')
            time.sleep(0.03) 
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def get_status():
    return jsonify(latest_stats)

@app.route('/toggle_inference', methods=['POST'])
def toggle_inference():
    global is_processing
    is_processing = not is_processing
    return jsonify({"status": is_processing})

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    global camera_active, is_processing
    camera_active = not camera_active
    if not camera_active: is_processing = False 
    return jsonify({"status": camera_active})

@app.route('/api/update_params', methods=['POST'])
def update_params():
    data = request.json
    
    # 1. Get Values
    t = data.get('ambientTemp', 25.0)
    h = data.get('ambientHum', 70.0)
    m = data.get('soilMoisture', 35.0)
    st = data.get('soilTemp', 22.0)
    
    # 2. Schedule Logic (Time Calculation)
    now = datetime.now()
    
    def is_light_active(start_str, duration_mins):
        try:
            start_time = datetime.strptime(start_str, "%H:%M").time()
            start_dt = datetime.combine(now.date(), start_time)
            end_dt = start_dt + timedelta(minutes=int(duration_mins))
            return 1 if start_dt <= now <= end_dt else 0
        except: return 0

    uv_on = is_light_active(data.get('uvStart', "07:00"), data.get('uvDuration', 0))
    led_on = is_light_active(data.get('ledStart', "18:00"), data.get('ledDuration', 0))

    # 3. Format Command for Arduino: <temp,hum,moist,soilTemp,uv,led>
    # Inalis na natin ang targetLux dahil time-based na tayo
    command = f"<{t},{h},{m},{st},{uv_on},{led_on}>"
    print(f"🚀 Sending Hardware Command: {command}")
    
    try:
        sensor.send_command(command) 
        return jsonify({"status": "success", "uv": uv_on, "led": led_on})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)