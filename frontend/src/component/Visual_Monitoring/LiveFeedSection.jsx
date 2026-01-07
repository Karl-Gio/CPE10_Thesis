import Card from "react-bootstrap/Card";

export default function LiveFeedSection({ cameraActive, onToggleCam }) {
  return (
    <Card className="border-0 shadow-sm rounded-4">
      <Card.Body className="p-0">
        <div className="position-relative rounded-4 overflow-hidden" style={{ height: 420, background: "#000" }}>
          
          <img src="http://localhost:5000/video_feed" alt="Stream" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />

          {/* Camera Control Button */}
          <div className="position-absolute bottom-0 end-0 m-3">
            <button 
              onClick={onToggleCam}
              className={`btn ${cameraActive ? 'btn-danger' : 'btn-success'} rounded-pill px-3 shadow`}
            >
              {cameraActive ? "Stop Camera" : "Start Camera"}
            </button>
          </div>

          {/* LIVE indicator (Only show if cameraActive is true) */}
          {cameraActive && (
            <div className="position-absolute top-0 start-0 m-3 px-2 py-1 bg-dark text-white rounded-2 small">
               ● LIVE
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}