import Navbar from "react-bootstrap/Navbar";
import Container from "react-bootstrap/Container";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";

export default function DashboardHeader() {
  return (
    <Navbar bg="dark" variant="dark" className="rounded-3 px-3 py-2">
      <Container fluid className="p-0 d-flex justify-content-between align-items-center">
        <div className="d-flex align-items-center gap-3">
          <div style={{ fontSize: 28 }}>🌱</div>
          <div>
            <div className="fw-bold text-light">AgriVision AI</div>
            <div className="text-secondary" style={{ fontSize: 12, letterSpacing: 1 }}>
              SEED GERMINATION MONITORING SYSTEM
            </div>
          </div>
          <Badge bg="success" pill>
            LIVE
          </Badge>
        </div>

        <Button variant="outline-danger">Stop Monitoring</Button>
      </Container>
    </Navbar>
  );
}
