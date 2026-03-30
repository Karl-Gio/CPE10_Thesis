import cv2
import time
import threading
import os
import datetime
import numpy as np  # <-- IMPORTANT: Added numpy
from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# --- CONFIG ---
W, H = 3840, 2160
# CHEAT CODE 1: Binabaan ang standards para makita lahat
CONFIDENCE_THRESHOLD = 0.15  
SKIP_FRAMES = 3  
DATASET_FOLDER = "CapturedImage"

if not os.path.exists(DATASET_FOLDER):
    os.makedirs(DATASET_FOLDER)

# --- GLOBAL VARS ---
camera_active = False 
is_processing = False
view_mode = "normal" 

latest_stats = {
    "pechay_detected": 0, 
    "seedTarget": 30,
    "confidenceScore": 0, 
    "is_processing": False,
    "camera_active": False,
    "view_mode": "normal"
}

output_frame = None
lock = threading.Lock()

# --- LOAD MODEL ---
print("⏳ Loading YOLO Model...")
try:
    model = YOLO("best.pt")
    print("✅ Model Loaded!")
except Exception as e:
    print(f"❌ Error: {e}")
    model = None

def process_camera():
    global output_frame, latest_stats, camera_active, view_mode, is_processing
    
    cap = None 
    frame_count = 0
    
    last_annotated_frame = None 
    last_masked_frame = None

    while True:
        # 1. SLEEP MODE 
        if not camera_active:
            if cap is not None:
                cap.release()
                cap = None
                print("zzZ Camera entered sleep mode...")
                with lock:
                    output_frame = np.zeros((H, W, 3), dtype=np.uint8)
            time.sleep(0.2)
            continue

        # 2. START CAMERA
        if cap is None:
            print("🚀 Starting Camera...")
            cap = cv2.VideoCapture(0) 
            cap.set(3, W)
            cap.set(4, H)
            time.sleep(0.5) 
            
            if not cap.isOpened():
                print("❌ Failed to open camera! Retrying...")
                cap = None 
                time.sleep(1) 
                continue

        # 3. READ FRAME
        success, frame = cap.read()
        if not success:
            print("⚠️ Failed to read frame. Skipping...")
            time.sleep(0.01)
            continue

        # --- MIRROR FRAME ---
        frame = cv2.flip(frame, 1)
        final_frame = frame.copy()
        
        # --- AI DETECTION LOGIC ---
        if is_processing and model is not None:
            frame_count += 1
            
            if frame_count % SKIP_FRAMES == 0 or last_annotated_frame is None:
                
                # CHEAT CODE 2 & 3: Linalakihan ang imgsz at nilagyan ng iou=0.45 para di mawala ang box
                results = model.predict(frame, conf=CONFIDENCE_THRESHOLD, verbose=False, imgsz=1280, iou=0.45)
                
                count = len(results[0].boxes)
                
                if count > 0:
                    conf_sum = sum([box.conf.item() for box in results[0].boxes])
                    current_conf = round((conf_sum / count) * 100, 1)
                else:
                    current_conf = 0  
                
                annotated_frame = frame.copy()          
                masked_frame = np.zeros_like(frame)     
                
                for result in results:
                    for box in result.boxes:
                        x1, y1, x2, y2 = map(int, box.xyxy[0])
                        conf = float(box.conf[0])

                        x1, y1 = max(0, x1), max(0, y1)
                        x2, y2 = min(W, x2), min(H, y2)

                        # --- A. ANNOTATED FRAME ---
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                        label = f"Pechay {conf:.2f}"
                        cv2.putText(annotated_frame, label, (x1, y1 - 10), 
                                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)

                        # --- B. MASKED FRAME ---
                        try:
                            masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
                            cv2.rectangle(masked_frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
                        except:
                            pass 
                
                last_annotated_frame = annotated_frame
                last_masked_frame = masked_frame
                
                latest_stats["pechay_detected"] = count
                latest_stats["confidenceScore"] = current_conf
            
            else:
                if last_annotated_frame is not None:
                    annotated_frame = last_annotated_frame
                    masked_frame = last_masked_frame
                else:
                    annotated_frame = frame
                    masked_frame = np.zeros_like(frame)

            if view_mode == "masked":
                final_frame = masked_frame 
            else:
                final_frame = annotated_frame 

        else:
            frame_count = 0
            latest_stats["pechay_detected"] = 0
            final_frame = frame

        latest_stats["is_processing"] = is_processing
        latest_stats["camera_active"] = camera_active
        latest_stats["view_mode"] = view_mode

        with lock:
            output_frame = final_frame.copy()
        
        time.sleep(0.005)

t = threading.Thread(target=process_camera)
t.daemon = True
t.start()

# --- ROUTES ---
@app.route('/video_feed')
def video_feed():
    def generate():
        while True:
            if not camera_active and output_frame is None:
                time.sleep(0.5)
                continue     
            
            with lock:
                if output_frame is None:
                    time.sleep(0.05)
                    continue
                (flag, encodedImage) = cv2.imencode(".jpg", output_frame, [int(cv2.IMWRITE_JPEG_QUALITY), 70])
            
            if not flag: continue
            
            yield (b'--frame\r\n' b'Content-Type: image/jpeg\r\n\r\n' + encodedImage.tobytes() + b'\r\n')
            time.sleep(0.03) 

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')

@app.route('/status')
def get_status():
    return jsonify(latest_stats)

@app.route('/toggle_inference', methods=['POST'])
def toggle_inference():
    global is_processing
    is_processing = not is_processing
    print(f"Inference Toggled: {is_processing}")
    return jsonify({"status": is_processing})

@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    global camera_active, is_processing
    camera_active = not camera_active
    if not camera_active:
        is_processing = False 
    print(f"Camera Toggled: {camera_active}")
    return jsonify({"status": camera_active})

@app.route('/toggle_view', methods=['POST'])
def toggle_view():
    global view_mode
    view_mode = "masked" if view_mode == "normal" else "normal"
    print(f"View Mode Toggled: {view_mode}")
    return jsonify({"status": "success", "mode": view_mode})

@app.route('/capture_image', methods=['POST'])
def capture_image():
    global output_frame
    if output_frame is None:
        return jsonify({"status": "error", "message": "No frame"}), 400
    timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"{DATASET_FOLDER}/img_{timestamp}.jpg"
    with lock:
        cv2.imwrite(filename, output_frame)
    return jsonify({"status": "success", "file": filename})

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)