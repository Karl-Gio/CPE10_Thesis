import React from "react";
import Card from "react-bootstrap/Card";

export default function LiveFeedSection({ cameraActive, onToggleCam }) {
  
  // --- ZOOM HANDLERS ---
  // Tinatawag nito ang Python backend para mag-zoom
  const handleZoomIn = () => {
    if (cameraActive) {
      fetch("http://localhost:5000/zoom_in", { method: "POST" }).catch(err => console.error(err));
    }
  };

  const handleZoomOut = () => {
    if (cameraActive) {
      fetch("http://localhost:5000/zoom_out", { method: "POST" }).catch(err => console.error(err));
    }
  };

  return (
    <Card className="border-0 shadow-sm rounded-4">
      <Card.Body className="p-0">
        <div 
          className="position-relative rounded-4 overflow-hidden bg-black" 
          style={{ height: 420 }}
        >
          
          {/* VIDEO FEED */}
          <img 
            src="http://localhost:5000/video_feed" 
            alt="Live Camera Feed of Pechay Plants" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }} 
          />

          {/* --- ZOOM CONTROLS (Bottom Center) --- */}
          {cameraActive && (
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 d-flex gap-2">
              <button 
                onClick={handleZoomOut} 
                className="btn btn-dark btn-sm rounded-circle opacity-75 d-flex align-items-center justify-content-center shadow"
                style={{ width: 40, height: 40, border: '1px solid rgba(255,255,255,0.2)' }}
                title="Zoom Out"
              >
                <span className="fs-5 fw-bold mb-1">−</span>
              </button>
              
              <button 
                onClick={handleZoomIn} 
                className="btn btn-dark btn-sm rounded-circle opacity-75 d-flex align-items-center justify-content-center shadow"
                style={{ width: 40, height: 40, border: '1px solid rgba(255,255,255,0.2)' }}
                title="Zoom In"
              >
                <span className="fs-5 fw-bold mb-1">+</span>
              </button>
            </div>
          )}

          {/* --- CAMERA TOGGLE BUTTON (Bottom Right) --- */}
          <div className="position-absolute bottom-0 end-0 m-3">
            <button 
              onClick={onToggleCam}
              className={`btn ${cameraActive ? 'btn-danger' : 'btn-success'} rounded-pill px-4 shadow fw-bold`}
              style={{ minWidth: "120px" }}
            >
              {cameraActive ? "Stop Cam" : "Start Cam"}
            </button>
          </div>

          {/* --- LIVE INDICATOR (Top Left) --- */}
          {cameraActive && (
            <div className="position-absolute top-0 start-0 m-3 px-3 py-1 bg-dark bg-opacity-75 text-danger rounded-pill small fw-bold d-flex align-items-center gap-2 shadow-sm border border-secondary">
               <span className="spinner-grow spinner-grow-sm text-danger" role="status" aria-hidden="true"></span>
               LIVE
            </div>
          )}
        </div>
      </Card.Body>
    </Card>
  );
}