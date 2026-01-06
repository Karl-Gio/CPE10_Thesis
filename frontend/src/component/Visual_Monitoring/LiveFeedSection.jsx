import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";

export default function LiveFeedSection({ camera }) {
  return (
    <Card className="border-0 shadow-sm rounded-4">
      <Card.Body className="p-0">
        <div
          className="position-relative rounded-4 overflow-hidden"
          style={{
            height: 420,
            background: "linear-gradient(180deg, #0b1220, #0f172a)",
            border: "1px solid rgba(15,23,42,0.08)",
          }}
        >
          {/* top-left label */}
          <div
            className="position-absolute top-0 start-0 m-3 px-2 py-1 rounded-2"
            style={{
              fontSize: 12,
              background: "rgba(0,0,0,0.35)",
              color: "#e5e7eb",
              letterSpacing: 0.5,
            }}
          >
            {camera?.name || "CAM-01"} • LIVE
          </div>

          {/* corner markers (simple) */}
          <div
            className="position-absolute top-0 start-0"
            style={{ width: 18, height: 18, borderLeft: "2px solid #22c55e", borderTop: "2px solid #22c55e", margin: 16 }}
          />
          <div
            className="position-absolute top-0 end-0"
            style={{ width: 18, height: 18, borderRight: "2px solid #22c55e", borderTop: "2px solid #22c55e", margin: 16 }}
          />
          <div
            className="position-absolute bottom-0 start-0"
            style={{ width: 18, height: 18, borderLeft: "2px solid #22c55e", borderBottom: "2px solid #22c55e", margin: 16 }}
          />
          <div
            className="position-absolute bottom-0 end-0"
            style={{ width: 18, height: 18, borderRight: "2px solid #22c55e", borderBottom: "2px solid #22c55e", margin: 16 }}
          />

          {/* Center capture button */}
          <div className="position-absolute top-50 start-50 translate-middle">
            <Button variant="light" className="px-4 py-2 rounded-3">
              📷 Capture Frame
            </Button>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}
