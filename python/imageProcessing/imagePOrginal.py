import cv2
import time
import threading
import os
import datetime
import numpy as np
from flask import Flask, Response, jsonify
from flask_cors import CORS
from ultralytics import YOLO

app = Flask(__name__)
CORS(app)

# ============================================
# CONFIG
# ============================================
W, H = 1920, 1080
CONFIDENCE_THRESHOLD = 0.15
SKIP_FRAMES = 3
DATASET_FOLDER = "CapturedImage"

if not os.path.exists(DATASET_FOLDER):
    os.makedirs(DATASET_FOLDER)

# ============================================
# GERMINATION CONFIG
# ============================================
GERMINATION_MIN_COUNT = 1
GERMINATION_CONFIRM_FRAMES = 3

# ============================================
# GLOBAL VARS
# ============================================
camera_active = False
is_processing = False
view_mode = "normal"

output_frame = None
lock = threading.Lock()

germination_confirm_counter = 0
germination_saved_for_batch = {}

current_params = {
    "batch": "Batch A"
}

latest_stats = {
    "pechay_detected": 0,
    "seedTarget": 30,
    "confidenceScore": 0,
    "is_processing": False,
    "camera_active": False,
    "view_mode": "normal",
    "germination_confirm_counter": 0,
    "germination_saved": False,
    "batch": current_params["batch"]
}

# ============================================
# LOAD MODEL
# ============================================
print("⏳ Loading YOLO Model...")
try:
    model = YOLO("best.pt")
    print("✅ Model Loaded!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    model = None


# ============================================
# HELPER
# ============================================
def save_actual_germination_date(batch_id):
    global germination_saved_for_batch

    if batch_id not in germination_saved_for_batch:
        germination_saved_for_batch[batch_id] = False

    if germination_saved_for_batch[batch_id]:
        return

    germination_saved_for_batch[batch_id] = True
    print(f"✅ Germination confirmed for {batch_id} at {datetime.datetime.now()}")

def process_camera():
    global output_frame
    global latest_stats
    global camera_active
    global view_mode
    global is_processing
    global germination_confirm_counter

    cap = None
    frame_count = 0
    last_annotated_frame = None
    last_masked_frame = None

    while True:
        try:
            if not camera_active:
                if cap is not None:
                    cap.release()
                    cap = None
                    print("📷 Camera released / sleep mode.")

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
                    latest_stats["germination_confirm_counter"] = germination_confirm_counter

                time.sleep(0.2)
                continue

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

            success, frame = cap.read()
            if not success:
                print("⚠️ Failed to read frame. Skipping...")
                time.sleep(0.01)
                continue

            frame = cv2.flip(frame, 1)
            final_frame = frame.copy()

            if is_processing and model is not None:
                frame_count += 1

                if frame_count % SKIP_FRAMES == 0 or last_annotated_frame is None:
                    results = model.predict(
                        frame,
                        conf=CONFIDENCE_THRESHOLD,
                        verbose=False,
                        imgsz=1280,
                        iou=0.45
                    )

                    count = len(results[0].boxes)

                    if count > 0:
                        conf_sum = sum(box.conf.item() for box in results[0].boxes)
                        current_conf = round((conf_sum / count) * 100, 1)
                    else:
                        current_conf = 0

                    if count >= GERMINATION_MIN_COUNT:
                        with lock:
                            germination_confirm_counter += 1
                    else:
                        with lock:
                            germination_confirm_counter = 0

                    annotated_frame = frame.copy()
                    masked_frame = np.zeros_like(frame)

                    for result in results:
                        for box in result.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            conf = float(box.conf[0])

                            x1, y1 = max(0, x1), max(0, y1)
                            x2, y2 = min(W, x2), min(H, y2)

                            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            label = f"Pechay {conf:.2f}"
                            cv2.putText(
                                annotated_frame,
                                label,
                                (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.5,
                                (0, 255, 0),
                                2
                            )

                            try:
                                masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
                                cv2.rectangle(masked_frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
                            except Exception:
                                pass

                    last_annotated_frame = annotated_frame
                    last_masked_frame = masked_frame

                    with lock:
                        latest_stats["pechay_detected"] = count
                        latest_stats["confidenceScore"] = current_conf
                        latest_stats["germination_confirm_counter"] = germination_confirm_counter

                else:
                    if last_annotated_frame is not None:
                        annotated_frame = last_annotated_frame
                        masked_frame = last_masked_frame
                    else:
                        annotated_frame = frame
                        masked_frame = np.zeros_like(frame)

                final_frame = masked_frame if view_mode == "masked" else annotated_frame

            else:
                frame_count = 0
                with lock:
                    germination_confirm_counter = 0
                    latest_stats["pechay_detected"] = 0
                    latest_stats["confidenceScore"] = 0
                    latest_stats["germination_confirm_counter"] = germination_confirm_counter

                final_frame = frame

            with lock:
                latest_stats["is_processing"] = is_processing
                latest_stats["camera_active"] = camera_active
                latest_stats["view_mode"] = view_mode
                output_frame = final_frame.copy()

            time.sleep(0.005)

        except Exception as e:
            print(f"⚠️ Camera thread error: {e}")
            time.sleep(0.2)

            

            # ============================================
            # START CAMERA
            # ============================================
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

            # ============================================
            # READ FRAME
            # ============================================
            success, frame = cap.read()
            if not success:
                print("⚠️ Failed to read frame. Skipping...")
                time.sleep(0.01)
                continue

            # Mirror frame
            frame = cv2.flip(frame, 1)
            final_frame = frame.copy()

            # ============================================
            # AI DETECTION LOGIC
            # ============================================
            if is_processing and model is not None:
                frame_count += 1

                if frame_count % SKIP_FRAMES == 0 or last_annotated_frame is None:
                    results = model.predict(
                        frame,
                        conf=CONFIDENCE_THRESHOLD,
                        verbose=False,
                        imgsz=1280,
                        iou=0.45
                    )

                    count = len(results[0].boxes)
                    batch_id = current_params.get("batch", "Batch A")

                    if count > 0:
                        conf_sum = sum(box.conf.item() for box in results[0].boxes)
                        current_conf = round((conf_sum / count) * 100, 1)
                    else:
                        current_conf = 0

                    # ============================================
                    # GERMINATION LOGIC
                    # ============================================
                    with lock:
                        if count >= GERMINATION_MIN_COUNT:
                            germination_confirm_counter += 1
                        else:
                            germination_confirm_counter = 0

                        latest_stats["germination_confirm_counter"] = germination_confirm_counter

                    if germination_confirm_counter >= GERMINATION_CONFIRM_FRAMES:
                        save_actual_germination_date(batch_id)

                    annotated_frame = frame.copy()
                    masked_frame = np.zeros_like(frame)

                    for result in results:
                        for box in result.boxes:
                            x1, y1, x2, y2 = map(int, box.xyxy[0])
                            conf = float(box.conf[0])

                            x1, y1 = max(0, x1), max(0, y1)
                            x2, y2 = min(W, x2), min(H, y2)

                            # Annotated frame
                            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                            label = f"Pechay {conf:.2f}"
                            cv2.putText(
                                annotated_frame,
                                label,
                                (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.5,
                                (0, 255, 0),
                                2
                            )

                            # Masked frame
                            try:
                                masked_frame[y1:y2, x1:x2] = frame[y1:y2, x1:x2]
                                cv2.rectangle(masked_frame, (x1, y1), (x2, y2), (0, 255, 0), 1)
                            except Exception:
                                pass

                    last_annotated_frame = annotated_frame
                    last_masked_frame = masked_frame

                    with lock:
                        latest_stats["pechay_detected"] = count
                        latest_stats["confidenceScore"] = current_conf
                        latest_stats["germination_saved"] = germination_saved_for_batch.get(
                            batch_id, False
                        )
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
                with lock:
                    germination_confirm_counter = 0
                    latest_stats["pechay_detected"] = 0
                    latest_stats["confidenceScore"] = 0
                    latest_stats["germination_confirm_counter"] = germination_confirm_counter
                final_frame = frame

            with lock:
                latest_stats["is_processing"] = is_processing
                latest_stats["camera_active"] = camera_active
                latest_stats["view_mode"] = view_mode
                latest_stats["batch"] = current_params["batch"]
                output_frame = final_frame.copy()

            time.sleep(0.005)

        except Exception as e:
            print(f"⚠️ Camera thread error: {e}")
            time.sleep(0.2)


# Start camera thread
t = threading.Thread(target=process_camera, daemon=True)
t.start()


# ============================================
# ROUTES
# ============================================
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

                flag, encodedImage = cv2.imencode(
                    ".jpg",
                    output_frame,
                    [int(cv2.IMWRITE_JPEG_QUALITY), 70]
                )

            if not flag:
                continue

            yield (
                b'--frame\r\n'
                b'Content-Type: image/jpeg\r\n\r\n' +
                encodedImage.tobytes() +
                b'\r\n'
            )
            time.sleep(0.03)

    return Response(generate(), mimetype='multipart/x-mixed-replace; boundary=frame')


@app.route('/status')
def get_status():
    with lock:
        return jsonify(dict(latest_stats))


@app.route('/toggle_inference', methods=['POST'])
def toggle_inference():
    global is_processing
    global germination_confirm_counter

    is_processing = not is_processing

    if not is_processing:
        with lock:
            germination_confirm_counter = 0
            latest_stats["germination_confirm_counter"] = 0

    print(f"Inference Toggled: {is_processing}")
    return jsonify({"status": is_processing})


@app.route('/toggle_camera', methods=['POST'])
def toggle_camera():
    global camera_active, is_processing, germination_confirm_counter

    camera_active = not camera_active

    if not camera_active:
        is_processing = False
        with lock:
            germination_confirm_counter = 0
            latest_stats["germination_confirm_counter"] = 0

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


@app.route('/set_batch/<batch_name>', methods=['POST'])
def set_batch(batch_name):
    global germination_confirm_counter

    with lock:
        current_params["batch"] = batch_name
        germination_confirm_counter = 0
        latest_stats["germination_confirm_counter"] = 0
        latest_stats["batch"] = batch_name

    if batch_name not in germination_saved_for_batch:
        germination_saved_for_batch[batch_name] = False

    return jsonify({
        "status": "success",
        "batch": batch_name,
        "germination_saved": germination_saved_for_batch[batch_name]
    })


if __name__ == "__main__":
    app.run(host='0.0.0.0', port=5000, threaded=True, debug=False)