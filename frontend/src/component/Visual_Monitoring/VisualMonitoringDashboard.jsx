import React, { useState, useEffect } from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";

import LiveFeedSection from "./LiveFeedSection";
import InfoSidebar from "./InfoSidebar";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

export default function VisualMonitoringDashboard() {
  const [systemState, setSystemState] = useState({
    total: 0,
    radicle: 0,
    cotyledons: 0,
    true_leaves: 0,
    camera_active: true,
    is_processing: false,
    seedTarget: 30 // Set your target here
  });

  // Polling the Python backend for data every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("http://localhost:5000/status")
        .then((res) => res.json())
        .then((data) => {
          setSystemState((prev) => ({ ...prev, ...data }));
        })
        .catch((err) => console.error("Flask Server not reachable", err));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const toggleCam = () => {
    fetch("http://localhost:5000/toggle_camera", { method: 'POST' });
  };

  const toggleInference = () => {
    fetch("http://localhost:5000/toggle_inference", { method: 'POST' });
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
                <Col lg={8}>
                  <LiveFeedSection 
                    cameraActive={systemState.camera_active} 
                    onToggleCam={toggleCam} 
                  />
                </Col>
                <Col lg={4}>
                  <InfoSidebar 
                    data={systemState} 
                    onInference={toggleInference} 
                  />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}