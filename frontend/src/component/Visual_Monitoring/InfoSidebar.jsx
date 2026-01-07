import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import ProgressBar from "react-bootstrap/ProgressBar";

export default function InfoSidebar({ data, onInference }) {
  // Use 'total' from your python latest_stats, or default to 0
  const { total = 0, seedTarget = 30, confidenceScore = 92.5, is_processing, camera_active } = data;

  const pct = Math.min(100, Math.round((total / seedTarget) * 100));

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
              <div className="fs-2 fw-bold">{total}</div>
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

        {/* Inference Toggle Button */}
        <Button 
          className="w-100 py-2 rounded-3 fw-bold" 
          variant={is_processing ? "danger" : "primary"}
          onClick={onInference}
          disabled={!camera_active} // Disable if camera is off
        >
          {is_processing ? "Stop Inference" : "Run Inference"}
        </Button>
        
        {!camera_active && (
          <div className="text-center mt-2 small text-danger">
            Turn on camera to analyze
          </div>
        )}
      </Card.Body>
    </Card>
  );
}