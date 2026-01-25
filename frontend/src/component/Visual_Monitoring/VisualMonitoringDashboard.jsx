import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";

import LiveFeedSection from "./LiveFeedSection";
import InfoSidebar from "./InfoSidebar";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

// CONSTANT: Palitan ito ng IP ng RPi kung sa Laptop ka nagbubukas
const API_URL = "http://localhost:5000"; 

export default function VisualMonitoringDashboard() {
  // FIX 1: Set camera_active to FALSE by default (Sync with Python)
  const [systemState, setSystemState] = useState({
    pechay_detected: 0, // Renamed from total/radicle to match Python stats
    seedTarget: 30,
    confidenceScore: 0,
    camera_active: false, // <--- ITO ANG SUSI PARA HINDI MAG-CRASH
    is_processing: false,
    view_mode: "normal"
  });

  // Polling the Python backend for data every 500ms (Mas mabilis response)
  useEffect(() => {
    const interval = setInterval(() => {
      fetch(`${API_URL}/status`)
        .then((res) => res.json())
        .then((data) => {
          // Merge backend data with local state safely
          setSystemState((prev) => ({ ...prev, ...data }));
        })
        .catch((err) => console.error("Flask Server not reachable", err));
    }, 500); // 500ms is better for UI responsiveness

    return () => clearInterval(interval);
  }, []);

  // FIX 2: Update state based on Child Component's action
  // Ang LiveFeedSection na ang tumatawag sa API, dito ia-update lang natin ang UI
  const handleCamToggle = (newStatus) => {
    setSystemState(prev => ({ ...prev, camera_active: newStatus }));
  };

  return (
    <div className="d-flex" style={{ background: "#f5f7fb", minHeight: "100vh" }}>
      <SideBar />
      <div className="flex-grow-1">
        <DashboardHeader title="Visual Monitoring" />
        <Container fluid className="py-4" style={{ maxWidth: "1200px" }}>
          <Card className="shadow-sm border-0 rounded-4">
            <Card.Body className="p-4">
              <h3 className="fw-bold mb-4">Visual Validation</h3>
              <Row className="g-4">
                {/* LIVE FEED SECTION */}
                <Col lg={8}>
                  <LiveFeedSection 
                    cameraActive={systemState.camera_active} 
                    onToggleCam={handleCamToggle} 
                  />
                </Col>

                {/* INFO SIDEBAR */}
                <Col lg={4}>
                  <InfoSidebar data={systemState} />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}