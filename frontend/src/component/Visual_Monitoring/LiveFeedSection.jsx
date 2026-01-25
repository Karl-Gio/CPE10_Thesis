import React, { useState } from "react";
import Card from "react-bootstrap/Card";

const API_URL = "http://localhost:5000"; 

export default function LiveFeedSection({ cameraActive, onToggleCam }) {
  
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // --- CAMERA ON/OFF HANDLER ---
  const handleCamClick = async () => {
    if (isLoading) return;
    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/toggle_camera`, { method: "POST" });
      const data = await response.json();
      onToggleCam(data.status);
    } catch (err) {
      console.error("Failed to toggle Camera:", err);
      alert("Error: Cannot connect to Raspberry Pi");
    } finally {
      setIsLoading(false);
    }
  };

  // --- ZOOM HANDLERS ---
  const handleZoomIn = () => setZoomLevel(prev => Math.min(prev + 0.5, 3));
  const handleZoomOut = () => setZoomLevel(prev => Math.max(prev - 0.5, 1));

  return (
    <Card className="border-0 shadow-sm rounded-4">
      <Card.Body className="p-0">
        <div className="position-relative rounded-4 overflow-hidden bg-black" style={{ height: 420 }}>
          
          <div style={{ width: '100%', height: '100%', overflow: 'hidden', backgroundColor: 'black' }}>
            {cameraActive ? (
              // FIX: TINANGGAL NA ANG Date.now() DITO PARA HINDI MAG-RECONNECT LAGI
              <img 
                src={`${API_URL}/video_feed`} 
                alt="Live Camera Feed" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  transform: `scale(${zoomLevel})`, 
                  transformOrigin: 'center center',
                  transition: 'transform 0.3s ease'
                }} 
              />
            ) : (
              <div className="d-flex align-items-center justify-content-center h-100 text-secondary">
                <div className="text-center">
                  <h4>Camera is OFF</h4>
                  <p className="small">Click Start to view feed</p>
                </div>
              </div>
            )}
          </div>

          {/* CONTROLS (Only visible when active) */}
          {cameraActive && (
            <div className="position-absolute bottom-0 start-50 translate-middle-x mb-3 d-flex gap-2 z-3">
              <button onClick={handleZoomOut} className="btn btn-dark btn-sm rounded-circle opacity-75" style={{width:40, height:40}}>-</button>
              <button onClick={handleZoomIn} className="btn btn-dark btn-sm rounded-circle opacity-75" style={{width:40, height:40}}>+</button>
            </div>
          )}

          {/* START/STOP BUTTON */}
          <div className="position-absolute bottom-0 end-0 m-3">
            <button 
              onClick={handleCamClick}
              disabled={isLoading}
              className={`btn ${cameraActive ? 'btn-danger' : 'btn-success'} rounded-pill px-4 shadow fw-bold`}
              style={{ minWidth: "120px" }}
            >
              {isLoading ? "Wait..." : (cameraActive ? "Stop" : "Start")}
            </button>
          </div>

          {/* INDICATOR */}
          {cameraActive && (
            <div className="position-absolute top-0 start-0 m-3 px-3 py-1 bg-dark bg-opacity-75 text-danger rounded-pill small fw-bold shadow-sm">
               LIVE
            </div>
          )}

        </div>
      </Card.Body>
    </Card>
  );
}