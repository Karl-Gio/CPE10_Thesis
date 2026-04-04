from flask import Flask, jsonify, request
from flask_cors import CORS

from controllers import create_routes
from services.system_service import SystemService


def create_app():
    app = Flask(__name__)
    CORS(app)

    service = SystemService()
    service.sync_params_from_laravel()
    service.start_background_threads()

    app.register_blueprint(create_routes(service))

    def should_return_json():
        json_routes = {
            "/status",
            "/toggle_inference",
            "/set_auto_mode",
            "/toggle_camera",
            "/toggle_view",
            "/capture_image",
            "/video_feed",
        }
        return request.path.startswith("/api/") or request.path in json_routes

    @app.errorhandler(400)
    def handle_400(e):
        if should_return_json():
            return jsonify({
                "status": "error",
                "message": "Bad request"
            }), 400
        return e

    @app.errorhandler(404)
    def handle_404(e):
        if should_return_json():
            return jsonify({
                "status": "error",
                "message": f"Route not found: {request.path}"
            }), 404
        return e

    @app.errorhandler(405)
    def handle_405(e):
        if should_return_json():
            return jsonify({
                "status": "error",
                "message": "Method not allowed"
            }), 405
        return e

    @app.errorhandler(500)
    def handle_500(e):
        if should_return_json():
            return jsonify({
                "status": "error",
                "message": "Internal server error"
            }), 500
        return e

    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True, debug=False)