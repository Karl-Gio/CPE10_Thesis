import time
import cv2

from flask import Blueprint, Response, jsonify, request


def create_routes(service):
    bp = Blueprint("api_routes", __name__)

    @bp.route("/video_feed")
    def video_feed():
        def generate():
            while True:
                try:
                    with service.lock:
                        if service.output_frame is None:
                            time.sleep(0.05)
                            continue

                        flag, encoded_image = cv2.imencode(
                            ".jpg",
                            service.output_frame,
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

    @bp.route("/status")
    def get_status():
        return jsonify(service.get_status())

    @bp.route("/toggle_inference", methods=["POST"])
    def toggle_inference():
        payload, code = service.toggle_inference()
        return jsonify(payload), code

    @bp.route("/set_auto_mode", methods=["POST"])
    def set_auto_mode():
        return jsonify(service.set_auto_mode())

    @bp.route("/toggle_camera", methods=["POST"])
    def toggle_camera():
        return jsonify(service.toggle_camera())

    @bp.route("/toggle_view", methods=["POST"])
    def toggle_view():
        return jsonify(service.toggle_view())

    @bp.route("/capture_image", methods=["POST"])
    def capture_image():
        payload, code = service.capture_image()
        return jsonify(payload), code

    @bp.route("/api/update_params", methods=["POST"])
    def update_params():
        data = request.json if request.is_json else {}
        payload, code = service.update_params(data)
        return jsonify(payload), code

    @bp.route("/api/testing-parameters", methods=["POST"])
    def testing_parameters():
        payload, code = service.start_testing_session(request.json or {})
        return jsonify(payload), code

    @bp.route("/api/testing-stop", methods=["POST"])
    def testing_stop():
        payload, code = service.stop_testing_session()
        return jsonify(payload), code

    @bp.route("/api/testing-status", methods=["GET"])
    def testing_status():
        return jsonify(service.get_testing_status())

    @bp.route("/api/testing_command", methods=["POST"])
    def testing_command():
        payload, code = service.testing_command(request.json or {})
        return jsonify(payload), code

    @bp.route("/api/sequential_shutdown", methods=["POST"])
    def sequential_shutdown():
        payload, code = service.sequential_shutdown()
        return jsonify(payload), code

    @bp.route("/api/hardware_auto", methods=["POST"])
    def hardware_auto():
        payload, code = service.hardware_auto()
        return jsonify(payload), code

    @bp.route("/api/current_params", methods=["GET"])
    def get_current_params():
        return jsonify(service.get_current_params())

    @bp.route("/api/resend_params", methods=["POST"])
    def resend_params():
        payload, code = service.resend_params()
        return jsonify(payload), code

    @bp.route("/api/predict", methods=["POST"])
    def predict_germination():
        payload, code = service.predict(request.json or {})
        return jsonify(payload), code

    return bp