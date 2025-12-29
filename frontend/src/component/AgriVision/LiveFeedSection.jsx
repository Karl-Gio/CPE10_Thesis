import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";

export default function LiveFeedSection({ camera }) {
  return (
    <Card bg="dark" text="light" className="rounded-3">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="d-flex align-items-center gap-2">
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: 999,
                background: "red",
                display: "inline-block",
              }}
            />
            <div className="fw-semibold" style={{ fontSize: 13 }}>
              {camera.name} • LIVE FEED
            </div>
          </div>

          <Badge bg="secondary">
            {camera.res} • {camera.fps}
          </Badge>
        </div>

        {/* Feed area */}
        <div
          className="rounded-3 position-relative"
          style={{
            height: 770,
            background: "#0f172a",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          {/* Green detection box */}
          <div
            className="position-absolute top-50 start-50 translate-middle d-flex flex-column justify-content-center align-items-center text-center rounded-3"
            style={{
              width: 340,
              height: 260,
              border: "2px solid #22c55e",
              color: "#cbd5e1",
            }}
          >
            <div style={{ fontSize: 34 }}>📷</div>
            <div className="mt-2 text-success fw-semibold" style={{ fontSize: 12, letterSpacing: 1 }}>
              DETECTING SEEDS
            </div>
            <div className="mt-1" style={{ opacity: 0.8 }}>
              Camera Source Input
            </div>
            <div style={{ opacity: 0.6, fontSize: 12 }}>Connecting to /dev/video0…</div>
          </div>

          {/* Bottom camera stats */}
          <div className="position-absolute bottom-0 start-0 p-3 d-flex gap-2">
            <Badge bg="secondary">ISO: 800</Badge>
            <Badge bg="secondary">IRIS: F2.4</Badge>
            <Badge bg="secondary">EXP: +0.0</Badge>
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}