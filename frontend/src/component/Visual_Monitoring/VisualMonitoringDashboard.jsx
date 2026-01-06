import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";

import LiveFeedSection from "./LiveFeedSection";
import InfoSidebar from "./InfoSidebar";
import { SideBar, DashboardHeader } from "../Layout/LayoutComponents";

export default function VisualMonitoringDashboard() {
  const mockData = {
    seedCount: 26,
    seedTarget: 30,
    confidenceScore: 92.5,
    camera: { name: "CAM-01" },
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
                  <LiveFeedSection camera={mockData.camera} />
                </Col>

                <Col lg={4}>
                  <InfoSidebar data={mockData} />
                </Col>
              </Row>
            </Card.Body>
          </Card>
        </Container>
      </div>
    </div>
  );
}