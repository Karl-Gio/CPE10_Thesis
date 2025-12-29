import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import DashboardHeader from "./DashboardHeader";
import LiveFeedSection from "./LiveFeedSection";
import InfoSidebar from "./InfoSidebar";

export default function AgriVisionDashboard() {
  const mockData = {
    seedStatus: "Germinated",
    germinatedAccuracy: 86.6,
    detectionRate: 95.1,
    seedsPlanted: 142,
    germinatedCount: 118,
    confidence: "High",
    camera: { name: "CAM-01", res: "1920x1080", fps: "30FPS" },
  };

  return (
    <Container fluid className="p-3 vh-100" style={{background: "#0f172a"}}>
      <DashboardHeader />

      <Row className="g-3 mt-1">
        <Col lg={8}>
          <LiveFeedSection camera={mockData.camera} />
        </Col>

        <Col lg={4}>
          <InfoSidebar data={mockData} />
        </Col>
      </Row>
    </Container>
  );
}
