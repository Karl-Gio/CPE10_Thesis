import Card from "react-bootstrap/Card";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";

/* Top info strip: Batch ID + Date Planted */
export function PredictionMeta({ batchId, datePlanted }) {
  return (
    <Card className="border-0 shadow-sm rounded-4 mb-4">
      <Card.Body className="p-4">
        <Row className="g-4">
          <Col md={3}>
            <div className="text-uppercase small text-muted fw-bold">Batch ID</div>
            <div className="fw-bold">{batchId}</div>
          </Col>
          <Col md={3}>
            <div className="text-uppercase small text-muted fw-bold">Date Planted</div>
            <div className="fw-bold">{datePlanted}</div>
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
