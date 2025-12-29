import { useEffect, useState } from "react";
import Card from "react-bootstrap/Card";

export default function SystemTimeCard() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <Card bg="dark" text="light" className="rounded-3">
      <Card.Body>
        <div className="text-secondary" style={{ fontSize: 15, letterSpacing: 1 }}>
          SYSTEM TIME
        </div>
        <div className="fw-bold" style={{ fontSize: 32 }}>
          {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
        </div>
        <div className="text-secondary" style={{ fontSize: 15, letterSpacing: 1 }}>
          {now.toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
        </div>
      </Card.Body>
    </Card>
  );
}