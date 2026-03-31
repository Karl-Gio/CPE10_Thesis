from flask import Flask
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
    return app


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, threaded=True, debug=False)