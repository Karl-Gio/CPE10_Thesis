import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";

export default function InfoSidebar({ data }) {
  const { seedCount = 0, seedTarget = 30, confidenceScore = 0 } = data;

  const pct = Math.min(100, Math.round((seedCount / seedTarget) * 100));

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
              Seed Count
            </div>
            <div className="d-flex align-items-baseline gap-2">
              <div className="fs-2 fw-bold">{seedCount}</div>
              <div className="text-muted">/ {seedTarget}</div>
            </div>
            <ProgressBar
              now={pct}
              className="mt-2"
              style={{ height: 8 }}
              variant="success"
            />
          </Card.Body>
        </Card>

        {/* Confidence card */}
        <Card className="border rounded-4 mb-3">
          <Card.Body className="p-3">
            <div className="text-muted" style={{ fontSize: 13 }}>
              Confidence Score
            </div>
            <div className="fs-2 fw-bold">{confidenceScore}%</div>
          </Card.Body>
        </Card>

        {/* Action */}
        <Button className="w-100 py-2 rounded-3" variant="primary">
          Run Inference
        </Button>
      </Card.Body>
    </Card>
  );
}
