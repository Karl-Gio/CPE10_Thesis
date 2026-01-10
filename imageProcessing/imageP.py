import cv2
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS
import time
import threading
import os
import datetime

app = Flask(__name__)
CORS(app)

# --- CONFIG (720p for Speed) ---
W, H = 1280, 720 

# --- STRICT VALIDATION SETTINGS ---
LOWER_GREEN = np.array([25, 30, 30])
UPPER_GREEN = np.array([95, 255, 255])
MIN_AREA_NOISE = 200         
AREA_THRESHOLD_PASS = 4000   

# --- FOLDER SETUP ---
DATASET_FOLDER = "CapturedImage"
if not os.path.exists(DATASET_FOLDER):
    os.makedirs(DATASET_FOLDER)

camera_active = True
is_processing = False
zoom_level = 1.0
view_mode = "normal"  # <--- NEW: Default is normal view

# Stats
latest_stats = {"pechay_detected": 0, "unrecognized": 0, "total": 0}
output_frame = None
lock = threading.Lock() 

# --- FAST ZOOM ALGORITHM ---
def apply_zoom(img, zoom):
    if zoom <= 1.0: return img 
    h, w, _ = img.shape
    new_h, new_w = int(h / zoom), int(w / zoom)
    start_y = (h - new_h) // 2
    start_x = (w - new_w) // 2
    cropped = img[start_y:start_y+new_h, start_x:start_x+new_w]
    return cv2.resize(cropped, (w, h), interpolation=cv2.INTER_LINEAR)

# --- MAIN PROCESS ---
def process_camera():
    global output_frame, latest_stats, camera_active, is_processing, zoom_level, view_mode
    
    cap = cv2.VideoCapture(0, cv2.CAP_V4L2)
    cap.set(cv2.CAP_PROP_FOURCC, cv2.VideoWriter_fourcc('M', 'J', 'P', 'G'))
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, W)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, H)
    cap.set(cv2.CAP_PROP_FPS, 30)
    
    print("🚀 STRICT Validation Mode Started")

    while True:
        final_frame = None

        if not camera_active:
            # Offline Screen
            final_frame = np.zeros((H, W, 3), dtype=np.uint8)
            text = "CAMERA OFFLINE"
            font = cv2.FONT_HERSHEY_SIMPLEX
            text_size = cv2.getTextSize(text, font, 1.5, 2)[0]
            text_x = (W - text_size[0]) // 2
            text_y = (H + text_size[1]) // 2
            cv2.putText(final_frame, text, (text_x, text_y), font, 1.5, (255, 255, 255), 2)
            time.sleep(0.03)

        else:
            success, raw_frame = cap.read()
            if not success: 
                time.sleep(0.01); continue
            
            frame = apply_zoom(raw_frame, zoom_level)
            frame = cv2.flip(frame, 1)

            # --- 1. ALWAYS GENERATE MASK (Kahit naka-off ang inference) ---
            detect_scale = 4 
            small = cv2.resize(frame, (int(W/detect_scale), int(H/detect_scale)))
            hsv = cv2.cvtColor(small, cv2.COLOR_BGR2HSV)
            
            # Create Mask
            mask_small = cv2.inRange(hsv, LOWER_GREEN, UPPER_GREEN)
            mask_small = cv2.morphologyEx(mask_small, cv2.MORPH_OPEN, np.ones((3,3), np.uint8))
            
            # Upscale mask back to 720p para maganda sa video feed
            mask_full = cv2.resize(mask_small, (W, H), interpolation=cv2.INTER_NEAREST)

            # Create "Black & Green" view (Masked View)
            masked_view = cv2.bitwise_and(frame, frame, mask=mask_full)

            # --- 2. DETECTION LOGIC (Only if ON) ---
            count_valid = 0
            count_invalid = 0
            
            if is_processing:
                contours, _ = cv2.findContours(mask_small, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
                
                for cnt in contours:
                    real_area = cv2.contourArea(cnt) * (detect_scale ** 2)
                    if real_area < MIN_AREA_NOISE: continue
                    
                    x, y, w, h = cv2.boundingRect(cnt)
                    x, y, w, h = x*detect_scale, y*detect_scale, w*detect_scale, h*detect_scale
                    
                    # Solidity Check (Your existing logic)
                    bounding_box_area = w * h
                    solidity = float(real_area) / bounding_box_area

                    if real_area >= AREA_THRESHOLD_PASS and solidity < 0.90:
                        count_valid += 1
                        color = (0, 255, 0) # Green
                        label = "VALID PECHAY"
                    else:
                        count_invalid += 1
                        color = (0, 0, 255) # Red
                        if real_area >= AREA_THRESHOLD_PASS and solidity >= 0.90:
                             label = "BOX DETECTED"
                        else:
                             label = "UNRECOGNIZED"
                    
                    # Draw on NORMAL frame
                    cv2.rectangle(frame, (x, y), (x + w, y + h), color, 3)
                    cv2.putText(frame, f"{label}", (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

                    # Draw on MASKED frame too (para kita pa rin boxes sa black screen)
                    cv2.rectangle(masked_view, (x, y), (x + w, y + h), color, 3)

                latest_stats = {
                    "pechay_detected": count_valid, 
                    "unrecognized": count_invalid, 
                    "total": count_valid + count_invalid
                }
            else:
                latest_stats = {"pechay_detected": 0, "unrecognized": 0, "total": 0}

            # --- 3. SWITCH VIEW ---
            if view_mode == "masked":
                final_frame = masked_view  # Ito yung Black Background
            else:
                final_frame = frame        # Ito yung Normal Video

        with lock:
            if final_frame is not None:
                output_frame = final_frame.copy()

t = threading.Thread(target=process_camera)
t.daemon = True
t.start()

# --- ROUTES ---

@app.route('/capture_image', methods=['POST'])
def capture_image():
    global output_frame
    with lock:
        if output_frame is None: return jsonify({"status": "failed"})
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"{DATASET_FOLDER}/validate_{timestamp}.jpg"
        cv2.imwrite(filename, output_frame)
    return jsonify({"status": "success", "file": filename})

@app.route('/toggle_view', methods=['POST'])
def toggle_view():
    global view_mode
    view_mode = "masked" if view_mode == "normal" else "normal"
    return jsonify({"view_mode": view_mode})

@app.route('/zoom_in', methods=['POST'])
def zoom_in(): global zoom_level; zoom_level = min(zoom_level + 0.5, 4.0); return jsonify({"zoom": zoom_level})

@app.route('/zoom_out', methods=['POST'])
def zoom_out(): global zoom_level; zoom_level = max(zoom_level - 0.5, 1.0); return jsonify({"zoom": zoom_level})

@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            with lock:
                if output_frame is None: time.sleep(0.01); continue
                ret, buffer = cv2.imencode('.jpg', output_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            if ret: yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + buffer.tobytes() + b'\r\n')
            time.sleep(0.033) 
    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def get_status(): 
    # Add view_mode to the status response
    return jsonify({
        **latest_stats, 
        "camera_active": camera_active, 
        "is_processing": is_processing, 
        "zoom": zoom_level,
        "view_mode": view_mode 
    })

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera(): global camera_active; camera_active = not camera_active; return jsonify({"camera_active": camera_active})

@app.route('/toggle_inference', methods=['POST'])
def toggle_inference(): global is_processing; is_processing = not is_processing; return jsonify({"is_processing": is_processing})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True)