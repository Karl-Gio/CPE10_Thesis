import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Form from "react-bootstrap/Form"; // Idinagdag natin ito para sa Dropdown!

/* Top info strip: Batch ID Dropdown + Date Planted */
export function PredictionMeta({ batchId, datePlanted, onBatchChange }) {
  // Sample list ng batches (Aayos sa mockDatabase natin sa main page)
  const availableBatches = ["B-2025-001", "B-2025-002", "B-2025-003"];

  return (
    <Card className="border-0 shadow-sm rounded-4 mb-4">
      <Card.Body className="p-4">
        <Row className="g-4 align-items-center">
          <Col md={4}>
            <div className="text-uppercase small text-muted fw-bold mb-1">Select Batch ID</div>
            {/* Ito yung Dropdown! */}
            <Form.Select 
              value={batchId} 
              onChange={(e) => onBatchChange && onBatchChange(e.target.value)}
              className="fw-bold"
              style={{ cursor: "pointer", border: "1px solid #dee2e6" }}
            >
              {availableBatches.map((batch) => (
                <option key={batch} value={batch}>
                  {batch}
                </option>
              ))}
            </Form.Select>
          </Col>
          <Col md={4}>
            <div className="text-uppercase small text-muted fw-bold mb-1">Date Planted</div>
            <div className="fw-bold mt-1">{datePlanted}</div>
          </Col>
        </Row>
      </Card.Body>
    </Card>
  );
}

/* Big white stat card with green top border */
export function PredictionStatCard({ title, value, subText }) {
  return (
    <Card className="border-0 shadow-sm rounded-4 h-100">
      <div style={{ height: 4, background: "#22c55e", borderTopLeftRadius: 16, borderTopRightRadius: 16 }} />
      <Card.Body className="p-4 text-center">
        <div className="text-muted fw-semibold">{title}</div>
        <div className="display-6 fw-bold my-2">{value}</div>
        {subText ? <div className="small text-success">{subText}</div> : null}
      </Card.Body>
    </Card>
  );
}

/* Bottom bars */
export function PredictionBottomBar({ leftLabel, rightValue, variant = "dark" }) {
  const isGreen = variant === "green";

  return (
    <Card
      className="border-0 rounded-4 h-100"
      style={{
        background: isGreen ? "#0a9b67" : "#0b1220",
        color: "white",
      }}
    >
      <Card.Body className="px-4 py-3 d-flex justify-content-between align-items-center">
        <div className="fw-semibold" style={{ opacity: isGreen ? 1 : 0.7 }}>
          {leftLabel}
        </div>
        <div className="fw-bold">{rightValue}</div>
      </Card.Body>
    </Card>
  );
}