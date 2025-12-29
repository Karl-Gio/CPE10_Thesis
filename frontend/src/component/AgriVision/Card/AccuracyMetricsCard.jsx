import Card from "react-bootstrap/Card";
import ProgressBar from "react-bootstrap/ProgressBar";

export default function AccuracyMetricsCard({
  germinatedAccuracy,
  detectionRate,
  seedsPlanted,
  germinatedCount,
  confidence,
}) {
  return (
    <Card bg="dark" text="light" className="rounded-3">
      <Card.Body>
        <div className="text-secondary" style={{ fontSize: 12, letterSpacing: 1 }}>
          ACCURACY METRICS
        </div>

        <div className="mt-3">
          <div className="d-flex justify-content-between">
            <span style={{ fontSize: 13 }}>Germinated Accuracy</span>
            <span className="text-success fw-semibold">{germinatedAccuracy.toFixed(1)}%</span>
          </div>
          <ProgressBar now={germinatedAccuracy} className="mt-2" />
          <div className="text-secondary mt-2 text-end" style={{ fontSize: 12 }}>
            Confidence Level: {confidence}
          </div>
        </div>

        <div className="mt-4">
          <div className="d-flex justify-content-between">
            <span style={{ fontSize: 13 }}>Seed Detection Rate</span>
            <span className="fw-semibold">{detectionRate.toFixed(1)}%</span>
          </div>
          <ProgressBar now={detectionRate} className="mt-2" />
        </div>

        <div className="mt-4 d-flex justify-content-between">
          <div>
            <div className="text-secondary" style={{ fontSize: 12 }}>
              Seeds Planted
            </div>
            <div className="fw-bold" style={{ fontSize: 24 }}>
              {seedsPlanted}
            </div>
          </div>

          <div className="text-end">
            <div className="text-secondary" style={{ fontSize: 12 }}>
              Germinated
            </div>
            <div className="fw-bold text-success" style={{ fontSize: 24 }}>
              {germinatedCount}
            </div>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}