import cv2
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS
import time
import threading

app = Flask(__name__)
CORS(app)

# --- CONFIG & GLOBALS ---
LOWER_GREEN = np.array([35, 40, 40]); UPPER_GREEN = np.array([85, 255, 255])
MIN_AREA_NOISE = 300; AREA_COTYLEDONS = 1500; AREA_TRUE_LEAVES = 8000

camera_active = True
is_processing = False
latest_stats = {"radicle": 0, "cotyledons": 0, "true_leaves": 0, "total": 0}
output_frame = None
lock = threading.Lock() # Prevents data corruption during threading

# --- BACKGROUND PROCESS ---
def process_camera():
    global output_frame, latest_stats, camera_active, is_processing
    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640) # Reduced resolution for speed
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
    cap.set(cv2.CAP_PROP_FPS, 30)

    while True:
        if not camera_active:
            # Create dummy black frame
            frame = np.zeros((480, 640, 3), dtype=np.uint8)
            cv2.putText(frame, "CAMERA OFFLINE", (180, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, (255, 255, 255), 2)
        else:
            success, frame = cap.read()
            if not success: continue
            
            frame = cv2.flip(frame, 1)

            if is_processing:
                # --- FAST PROCESSING ---
                hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
                mask = cv2.inRange(hsv, LOWER_GREEN, UPPER_GREEN)
                # Smaller kernel for faster morphology
                mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((3,3), np.uint8))
                
                contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                t_rad, t_cot, t_true = 0, 0, 0
                for cnt in contours:
                    area = cv2.contourArea(cnt)
                    if area < MIN_AREA_NOISE: continue
                    x, y, w, h = cv2.boundingRect(cnt)
                    
                    if area > AREA_TRUE_LEAVES: t_true += 1; color = (0, 255, 0)
                    elif area > AREA_COTYLEDONS: t_cot += 1; color = (0, 165, 255)
                    else: t_rad += 1; color = (128, 128, 128)
                    
                    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

                latest_stats = {"radicle": t_rad, "cotyledons": t_cot, "true_leaves": t_true, "total": t_rad+t_cot+t_true}
            else:
                latest_stats = {"radicle": 0, "cotyledons": 0, "true_leaves": 0, "total": 0}

        with lock:
            output_frame = frame.copy()

# Start the background thread
t = threading.Thread(target=process_camera)
t.daemon = True
t.start()

# --- ROUTES ---
def generate_frames():
    while True:
        with lock:
            if output_frame is None:
                continue
            ret, buffer = cv2.imencode('.jpg', output_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            frame_bytes = buffer.tobytes()

        yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + frame_bytes + b'\r\n')
        time.sleep(0.03) # Limits stream to ~30 FPS to save bandwidth

@app.route('/video_feed')
def video_feed():
    return Response(generate_frames(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def get_status():
    return jsonify({**latest_stats, "camera_active": camera_active, "is_processing": is_processing})

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    global camera_active; camera_active = not camera_active
    return jsonify({"camera_active": camera_active})

@app.route('/toggle_inference', methods=['POST'])
def toggle_inference():
    global is_processing; is_processing = not is_processing
    return jsonify({"is_processing": is_processing})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True)