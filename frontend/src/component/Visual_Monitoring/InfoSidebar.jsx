import React, { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";

const API_URL = "http://localhost:5000";

// NOTE: 'onInference' prop is removed, handled internally now
export default function InfoSidebar({ data }) {
  
  // Default values para hindi mag-crash kung walang data
  const { 
    pechay_detected = 0, 
    seedTarget = 30, 
    confidenceScore = 0, 
    is_processing = false, 
    camera_active = true,
    view_mode = "normal" 
  } = data || {};
  
  const [loadingAction, setLoadingAction] = useState(""); // para sa button loading state

  const pct = Math.min(100, Math.round((pechay_detected / seedTarget) * 100));

  // --- API HELPERS ---
  const callApi = async (endpoint, actionName) => {
    if (!camera_active) return;
    setLoadingAction(actionName);
    try {
      await fetch(`${API_URL}/${endpoint}`, { method: "POST" });
    } catch (error) {
      console.error(`Error ${actionName}:`, error);
    } finally {
      setLoadingAction("");
    }
  };

  const handleCapture = async () => {
    if (!camera_active) return;
    setLoadingAction("capture");
    try {
      const response = await fetch(`${API_URL}/capture_image`, { method: "POST" });
      const result = await response.json();
      if (result.status === "success") {
        alert(`📸 Image Saved!\n${result.file}`);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoadingAction("");
    }
  };

  return (
    <Card className="shadow-sm border-0 rounded-4 h-100">
      <Card.Body className="p-4">
        <div className="text-uppercase small text-muted fw-bold mb-3">
          Image Analysis
        </div>

        {/* --- COUNT CARD --- */}
        <Card className="border rounded-4 mb-3">
          <Card.Body className="p-3">
            <div className="text-muted" style={{ fontSize: 13 }}>Pechay Count (Live)</div>
            <div className="d-flex align-items-baseline gap-2">
              <div className="fs-2 fw-bold">{pechay_detected}</div>
              <div className="text-muted">/ {seedTarget}</div>
            </div>
            <ProgressBar now={pct} className="mt-2" style={{ height: 8 }} variant="success" animated={is_processing} />
          </Card.Body>
        </Card>

        {/* --- CONFIDENCE CARD --- */}
        <Card className="border rounded-4 mb-3">
          <Card.Body className="p-3">
            <div className="text-muted" style={{ fontSize: 13 }}>Confidence Score</div>
            <div className="fs-2 fw-bold">{is_processing ? confidenceScore : 0}%</div>
          </Card.Body>
        </Card>

        <div className="d-grid gap-2">
          
          {/* 1. RUN INFERENCE BUTTON */}
          <Button 
            className="py-2 rounded-3 fw-bold" 
            variant={is_processing ? "danger" : "primary"}
            onClick={() => callApi("toggle_inference", "inference")}
            disabled={!camera_active} 
          >
            {is_processing ? "Stop Inference" : "Run Inference"}
          </Button>

          {/* 2. TOGGLE VIEW MODE (Hidden if AI is OFF) */}
          {is_processing && (
            <Button 
              className="py-2 rounded-3 fw-bold" 
              variant={view_mode === "masked" ? "warning" : "secondary"}
              onClick={() => callApi("toggle_view", "view")}
              disabled={!camera_active} 
            >
              {view_mode === "masked" ? "👁️ Show Normal View" : "🎭 Show Masked View"}
            </Button>
          )}

          {/* 3. CAPTURE BUTTON */}
          <Button 
            className="py-2 rounded-3 fw-bold" 
            variant="outline-dark"
            onClick={handleCapture}
            disabled={!camera_active || loadingAction === "capture"} 
          >
            {loadingAction === "capture" ? "Saving..." : "📸 Capture Dataset Image"}
          </Button>

        </div>
        
        {!camera_active && (
          <div className="text-center mt-3 small text-danger bg-danger bg-opacity-10 p-2 rounded">
            ⚠️ Camera is OFF. <br/> Please start the camera to enable controls.
          </div>
        )}
      </Card.Body>
    </Card>
  );
}