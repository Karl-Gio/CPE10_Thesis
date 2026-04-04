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
        try:
            return jsonify(service.get_status())
        except Exception as e:
            print(f"❌ /status error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/toggle_inference", methods=["POST"])
    def toggle_inference():
        try:
            payload, code = service.toggle_inference()
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /toggle_inference error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/set_auto_mode", methods=["POST"])
    def set_auto_mode():
        try:
            return jsonify(service.set_auto_mode())
        except Exception as e:
            print(f"❌ /set_auto_mode error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/toggle_camera", methods=["POST"])
    def toggle_camera():
        try:
            return jsonify(service.toggle_camera())
        except Exception as e:
            print(f"❌ /toggle_camera error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/toggle_view", methods=["POST"])
    def toggle_view():
        try:
            return jsonify(service.toggle_view())
        except Exception as e:
            print(f"❌ /toggle_view error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/capture_image", methods=["POST"])
    def capture_image():
        try:
            payload, code = service.capture_image()
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /capture_image error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/update_params", methods=["POST"])
    def update_params():
        try:
            data = request.json if request.is_json else {}
            payload, code = service.update_params(data)
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/update_params error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/testing-parameters", methods=["POST"])
    def testing_parameters():
        try:
            payload, code = service.start_testing_session(request.json or {})
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/testing-parameters error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/testing-stop", methods=["POST"])
    def testing_stop():
        try:
            payload, code = service.stop_testing_session()
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/testing-stop error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/testing-status", methods=["GET"])
    def testing_status():
        try:
            return jsonify(service.get_testing_status())
        except Exception as e:
            print(f"❌ /api/testing-status error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/testing_command", methods=["POST"])
    def testing_command():
        try:
            payload, code = service.testing_command(request.json or {})
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/testing_command error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/sequential_shutdown", methods=["POST"])
    def sequential_shutdown():
        try:
            payload, code = service.sequential_shutdown()
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/sequential_shutdown error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/hardware_auto", methods=["POST"])
    def hardware_auto():
        try:
            payload, code = service.hardware_auto()
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/hardware_auto error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/manual-hardware", methods=["POST"])
    def manual_hardware():
        try:
            payload, code = service.manual_hardware(request.json or {})
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/manual-hardware error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/current_params", methods=["GET"])
    def get_current_params():
        try:
            return jsonify(service.get_current_params())
        except Exception as e:
            print(f"❌ /api/current_params error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/resend_params", methods=["POST"])
    def resend_params():
        try:
            payload, code = service.resend_params()
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/resend_params error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    @bp.route("/api/predict", methods=["POST"])
    def predict_germination():
        try:
            payload, code = service.predict(request.json or {})
            return jsonify(payload), code
        except Exception as e:
            print(f"❌ /api/predict error: {e}")
            return jsonify({
                "status": "error",
                "message": str(e)
            }), 500

    return bp