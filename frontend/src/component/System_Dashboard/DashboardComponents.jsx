import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Stack from "react-bootstrap/Stack";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

/* ---------------- Metric Card ---------------- */

function MetricCard({ title, value, badgeText, subLeft, subRight, icon }) {
  return (
    <Card className="shadow-sm h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="text-uppercase small text-muted fw-bold">{title}</div>
          <div
            className="bg-light d-flex align-items-center justify-content-center"
            style={{ width: 34, height: 34, borderRadius: 10 }}
          >
            {icon}
          </div>
        </div>

        <div className="fs-3 fw-bold">{value}</div>

        <div className="d-flex align-items-center gap-2 mt-2">
          {badgeText ? (
            <Badge
              bg="success"
              className="bg-opacity-25 text-success border border-success"
            >
              {badgeText}
            </Badge>
          ) : null}
          <small className="text-muted">{subLeft}</small>
          {subRight ? <small className="text-muted">• {subRight}</small> : null}
        </div>
      </Card.Body>
    </Card>
  );
}

/* ---------------- Metric Grid ---------------- */

export function MetricGrid() {
  return (
    <Row className="g-3 mb-3">
      <Col md={6} xl={3}>
        <MetricCard
          title="Ambient Temp"
          value="24.83°C"
          badgeText="Optimal"
          subLeft="Target: 25.0°C"
          icon="⚡"
        />
      </Col>

      <Col md={6} xl={3}>
        <MetricCard
          title="Ambient Hum"
          value="68.91%"
          badgeText="Optimal"
          subLeft="Target: 70.0%"
          icon="🧪"
        />
      </Col>

      <Col md={6} xl={3}>
        <MetricCard
          title="Light Intensity"
          value="247.0 lx"
          subLeft="Status: Adequate"
          icon="☀️"
        />
      </Col>

      <Col md={6} xl={3}>
        <MetricCard
          title="Soil Moisture"
          value="29.46%"
          subLeft="Target: 30%"
          icon="☁️"
        />
      </Col>

      <Col md={6} xl={3}>
        <MetricCard
          title="Soil Humidity"
          value="56.04%"
          subLeft="Status: Monitoring"
          icon="💧"
        />
      </Col>

      <Col md={6} xl={3}>
        <MetricCard
          title="Soil Temp"
          value="23.23°C"
          subLeft="Status: Stable"
          icon="🌡️"
        />
      </Col>

      <Col md={6} xl={3}>
        <MetricCard
          title="Soil pH"
          value="6.5 pH"
          badgeText="Optimal"
          subLeft="Target: 6.5"
          icon="🧫"
        />
      </Col>
    </Row>
  );
}

/* ---------------- Trends + Health ---------------- */

function EnvironmentalTrendsChart() {
  // Sample labels like your screenshot
  const labels = ["21:00", "21:01", "21:02", "21:03", "21:04", "21:05", "21:06", "21:07"];

  const data = {
    labels,
    datasets: [
      {
        label: "Temp (°C)",
        data: [25.0, 24.6, 24.9, 24.7, 24.9, 25.0, 25.0, 24.8],
        borderColor: "#00b37a",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
      },
      {
        label: "Humidity (%)",
        data: [70.5, 69.7, 69.0, 69.5, 70.8, 71.0, 69.2, 70.6],
        borderColor: "#2f6bff",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        borderDash: [6, 6], // dashed blue line like the UI
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false, // IMPORTANT: lets us control height with a wrapper div
    plugins: {
      legend: {
        position: "top",
        labels: {
          boxWidth: 35,
          boxHeight: 10,
          usePointStyle: false,
        },
      },
      tooltip: {
        intersect: false,
        mode: "index",
      },
      title: { display: false },
    },
    interaction: {
      mode: "index",
      intersect: false,
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { maxRotation: 0, autoSkip: true },
      },
      y: {
        suggestedMin: 20,
        suggestedMax: 80,
        ticks: { stepSize: 10 },
        grid: { color: "rgba(0,0,0,0.06)" },
      },
    },
  };

  return (
    <div className="bg-white rounded border" style={{ height: 280, padding: 12 }}>
      <Line data={data} options={options} />
    </div>
  );
}

export function TrendsAndHealth() {
  return (
    <Row className="g-3">
      <Col xl={8}>
        <Card className="shadow-sm h-100">
          <Card.Body>
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0 fw-bold">Environmental Trends</h5>
              <Button size="sm" variant="light" className="border">
                Live Feed
              </Button>
            </div>

            <EnvironmentalTrendsChart />
          </Card.Body>
        </Card>
      </Col>

      <Col xl={4}>
        <Card className="shadow-sm h-100">
          <Card.Body>
            <h5 className="mb-3 fw-bold">System Health</h5>

            <div className="p-3 rounded bg-success bg-opacity-10 border border-success border-opacity-25 mb-3">
              <Stack direction="horizontal" gap={2}>
                <span className="text-success">●</span>
                <div>
                  <div className="fw-bold text-success">System Operational</div>
                  <div className="small text-muted">All sensors active</div>
                </div>
              </Stack>
            </div>

            <div className="text-uppercase small text-muted fw-bold mb-2">
              Logs
            </div>

            <div className="d-flex justify-content-between py-2 border-bottom">
              <span>DB Connection</span>
              <span className="text-success fw-bold">OK</span>
            </div>

            <div className="d-flex justify-content-between py-2 border-bottom">
              <span>Sensor Relay</span>
              <span className="text-success fw-bold">Active</span>
            </div>

            <div className="d-flex justify-content-between py-2">
              <span>Last Sync</span>
              <span className="fw-semibold">Just now</span>
            </div>
          </Card.Body>
        </Card>
      </Col>
    </Row>
  );
}
