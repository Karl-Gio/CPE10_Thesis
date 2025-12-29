import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";

export default function SeedStatusCard({ seedStatus, confidence }) {
  return (
    <Card bg="dark" text="light" className="rounded-3">
      <Card.Body>
        <div className="text-secondary" style={{ fontSize: 12, letterSpacing: 1 }}>
          CURRENT SEED STATUS
        </div>

        <div className="mt-3 p-3 rounded-3" style={{ background: "rgba(34,197,94,0.12)" }}>
          <div className="text-secondary" style={{ fontSize: 12 }}>
            Prediction Result
          </div>
          <div className="d-flex align-items-center gap-2 mt-1">
            <Badge bg="success" pill>
              ✓
            </Badge>
            <div className="fw-bold text-success" style={{ fontSize: 20 }}>
              {seedStatus}
            </div>
          </div>

          <div className="mt-2">
            <Badge bg="success" pill>
              Confidence: {confidence}
            </Badge>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}