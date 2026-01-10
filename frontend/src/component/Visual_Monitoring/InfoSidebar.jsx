import React, { useState } from "react";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";

// Define API URL to avoid hardcoding warnings
const API_URL = "http://localhost:5000";

export default function InfoSidebar({ data, onInference }) {
  // Kunin ang 'view_mode' mula sa data (default to 'normal' kung wala pa)
  const { 
    pechay_detected = 0, 
    seedTarget = 30, 
    confidenceScore = 92.5, 
    is_processing, 
    camera_active,
    view_mode = "normal" 
  } = data;
  
  const [isCapturing, setIsCapturing] = useState(false);
  const [isTogglingView, setIsTogglingView] = useState(false);

  const pct = Math.min(100, Math.round((pechay_detected / seedTarget) * 100));

  // --- FUNCTION TO CAPTURE IMAGE ---
  const handleCapture = async () => {
    if (!camera_active) return;

    setIsCapturing(true);
    try {
      const response = await fetch(`${API_URL}/capture_image`, { method: "POST" });
      const result = await response.json();
      
      if (result.status === "success") {
        console.log("Saved to:", result.file);
        alert(`📸 Image Saved!\nLocation: ${result.file}`);
      } else {
        alert("Failed to capture image.");
      }
    } catch (error) {
      console.error("Capture error:", error);
      alert("Error: Could not connect to Python backend.");
    } finally {
      setIsCapturing(false);
    }
  };

  // --- NEW: FUNCTION TO TOGGLE VIEW MODE ---
  const handleToggleView = async () => {
    if (!camera_active) return;
    setIsTogglingView(true);
    try {
      await fetch(`${API_URL}/toggle_view`, { method: "POST" });
    } catch (error) {
      console.error("Error toggling view:", error);
    } finally {
      setIsTogglingView(false);
    }
  };

  return (
    <Card className="shadow-sm border-0 rounded-4 h-100">
      <Card.Body className="p-4">
        <div className="text-uppercase small text-muted fw-bold mb-3">
          AI Analysis
        </div>

        {/* Seed count card */}
        <Card className="border rounded-4 mb-3">
          <Card.Body className="p-3">
            <div className="text-muted" style={{ fontSize: 13 }}>
              Pechay Count (Live)
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <div className="fs-2 fw-bold">{pechay_detected}</div>
              <div className="text-muted">/ {seedTarget}</div>
            </div>
            <ProgressBar
              now={pct}
              className="mt-2"
              style={{ height: 8 }}
              variant="success"
              animated={is_processing}
            />
          </Card.Body>
        </Card>

        {/* Confidence card */}
        <Card className="border rounded-4 mb-3">
          <Card.Body className="p-3">
            <div className="text-muted" style={{ fontSize: 13 }}>
              Confidence Score
            </div>
            <div className="fs-2 fw-bold">{is_processing ? confidenceScore : 0}%</div>
          </Card.Body>
        </Card>

        <div className="d-grid gap-2">
          {/* Inference Toggle Button */}
          <Button 
            className="py-2 rounded-3 fw-bold" 
            variant={is_processing ? "danger" : "primary"}
            onClick={onInference}
            disabled={!camera_active} 
          >
            {is_processing ? "Stop Inference" : "Run Inference"}
          </Button>

          {/* --- NEW BUTTON: VIEW MODE SWITCH --- */}
          <Button 
            className="py-2 rounded-3 fw-bold" 
            // Magiging dilaw ang button kapag naka-masked view para obvious
            variant={view_mode === "masked" ? "warning" : "secondary"}
            onClick={handleToggleView}
            disabled={!camera_active || isTogglingView} 
          >
            {view_mode === "masked" ? "👁️ Show Normal View" : "🎭 Show Masked View"}
          </Button>

          {/* Capture Button */}
          <Button 
            className="py-2 rounded-3 fw-bold" 
            variant="outline-dark"
            onClick={handleCapture}
            disabled={!camera_active || isCapturing} 
          >
            {isCapturing ? "Saving..." : "📸 Capture Dataset Image"}
          </Button>
        </div>
        
        {!camera_active && (
          <div className="text-center mt-3 small text-danger">
            Turn on camera to analyze or capture
          </div>
        )}
      </Card.Body>
    </Card>
  );
}