import cv2
import time
import threading
import os
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS

# Import custom modules
from imageProcessing.imageP import ImageP 
from sensorReadings.sht45 import SHT45Sensor

api = Flask(__name__)
CORS(api, resources={r"/*": {"origins": "*"}})

# --- GLOBALS ---
camera_active = False 
is_processing = False
view_mode = "normal"
output_frame = None
lock = threading.Lock()

latest_stats = {
    "pechay_detected": 0, 
    "confidenceScore": 0, 
    "is_processing": False,
    "camera_active": False,
    "temperature": 0.0,
    "humidity": 0.0,
}

# --- INITIALIZE MODULES ---
detector = ImageP("best.pt")
sensor = SHT45Sensor(port='/dev/ttyACM0')
sensor.start()

def process_camera():
    global output_frame, latest_stats, camera_active, view_mode, is_processing
    cap = None
    
    while True:
        # --- 1. ALWAYS MONITOR SENSORS ---
        # Kahit patay ang camera, ia-update nito ang latest_stats para sa React
        try:
            s_data = sensor.get_data()
            latest_stats.update(s_data)
        except Exception as e:
            print(f"Stats Update Error: {e}")

        # --- 2. CAMERA TOGGLE LOGIC ---
        if not camera_active:
            if cap is not None:
                cap.release()
                cap = None
            with lock:
                # Black placeholder for the stream
                output_frame = np.zeros((480, 640, 3), dtype=np.uint8)
            time.sleep(0.5) # Bagalan ang loop kung idle ang cam
            continue

        # --- 3. ACTIVE CAMERA PROCESSING ---
        if cap is None:
            cap = cv2.VideoCapture(0)
            cap.set(3, 640); cap.set(4, 480)
            if not cap.isOpened():
                time.sleep(1)
                continue

        success, frame = cap.read()
        if not success:
            time.sleep(0.01)
            continue

        frame = cv2.flip(frame, 1)
        display_frame = frame.copy()

        if is_processing:
            ann, mask, count, conf = detector.detect(frame)
            latest_stats["pechay_detected"] = count
            latest_stats["confidenceScore"] = conf
            display_frame = mask if view_mode == "masked" else ann
        else:
            latest_stats["pechay_detected"] = 0
            latest_stats["confidenceScore"] = 0

        latest_stats["is_processing"] = is_processing
        latest_stats["camera_active"] = camera_active

        with lock:
            output_frame = display_frame.copy()
        
        time.sleep(0.01)

# Start background thread
threading.Thread(target=process_camera, daemon=True).start()

# --- ROUTES ---
@api.route('/video_feed')
def video_feed():
    def generate():
        while True:
            with lock:
                if output_frame is None:
                    time.sleep(0.1)
                    continue
                (flag, img) = cv2.imencode(".jpg", output_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if not flag: continue
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + img.tobytes() + b'\r\n')
            time.sleep(0.04)
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@api.route('/status')
def get_status():
    return jsonify(latest_stats)

@api.route('/toggle_camera', methods=['POST'])
def toggle_c():
    global camera_active
    camera_active = not camera_active
    return jsonify({"status": camera_active})

@api.route('/toggle_inference', methods=['POST'])
def toggle_i():
    global is_processing
    is_processing = not is_processing
    return jsonify({"status": is_processing})

if __name__ == "__main__":
    api.run(host='0.0.0.0', port=5000, threaded=True, debug=False)