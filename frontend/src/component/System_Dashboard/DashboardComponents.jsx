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

import React, { useState, useEffect } from "react";

/* ---------------- Reusable Metric Card ---------------- */

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

/* ---------------- Metric Grid (Dynamic) ---------------- */
export function MetricGrid() {
  // 1. Create state for live sensor data
  const [liveData, setLiveData] = useState({
    temperature: 0,
    humidity: 0,
    pechay_detected: 0
  });

  // 2. Fetch data from Flask api.py
  useEffect(() => {
    const fetchStats = () => {
      fetch("http://192.168.18.93:5000/status")
        .then((res) => res.json())
        .then((data) => {
          setLiveData(data);
        })
        .catch((err) => console.error("API Error:", err));
    };

    const interval = setInterval(fetchStats, 2000); // Update every 2 seconds
    return () => clearInterval(interval);
  }, []);

  // 3. Complete list (Walang bawas)
  const sensorMetrics = [
    {
      title: "Ambient Temp",
      value: `${liveData.temperature.toFixed(2)}°C`, // LIVE DATA
      badgeText: liveData.temperature > 20 && liveData.temperature < 32 ? "Optimal" : "Warning",
      subLeft: "Target: 25.0°C",
      icon: "⚡",
    },
    {
      title: "Ambient Hum",
      value: `${liveData.humidity.toFixed(2)}%`, // LIVE DATA
      badgeText: "Optimal",
      subLeft: "Target: 70.0%",
      icon: "🧪",
    },
    {
      title: "Light Intensity",
      value: "247.0 lx",
      badgeText: null,
      subLeft: "Status: Adequate",
      icon: "☀️",
    },
    {
      title: "Soil Moisture",
      value: "29.46%",
      badgeText: null,
      subLeft: "Target: 30%",
      icon: "☁️",
    },
    {
      title: "Soil Humidity",
      value: "56.04%",
      badgeText: null,
      subLeft: "Status: Monitoring",
      icon: "💧",
    },
    {
      title: "Soil Temp",
      value: "23.23°C",
      badgeText: null,
      subLeft: "Status: Stable",
      icon: "🌡️",
    },
    {
      title: "Soil pH",
      value: "6.5 pH",
      badgeText: "Optimal",
      subLeft: "Target: 6.5",
      icon: "🧫",
    },
    {
      title: "Pechay Count", // Bonus: Para makita mo rin ang AI status
      value: liveData.pechay_detected,
      badgeText: "AI Live",
      subLeft: "Status: Detecting",
      icon: "🥬",
    },
  ];

  return (
    <Row className="g-3 mb-3">
      {sensorMetrics.map((metric, index) => (
        <Col key={index} md={6} xl={3}>
          <MetricCard
            title={metric.title}
            value={metric.value}
            badgeText={metric.badgeText}
            subLeft={metric.subLeft}
            icon={metric.icon}
          />
        </Col>
      ))}
    </Row>
  );
}

/* ---------------- Trends Chart (Dynamic) ---------------- */

function EnvironmentalTrendsChart({ timeLabels, temperatureData, humidityData }) {
  const data = {
    labels: timeLabels,
    datasets: [
      {
        label: "Temp (°C)",
        data: temperatureData,
        borderColor: "#00b37a",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
      },
      {
        label: "Humidity (%)",
        data: humidityData,
        borderColor: "#2f6bff",
        backgroundColor: "transparent",
        borderWidth: 2,
        tension: 0.35,
        pointRadius: 0,
        borderDash: [6, 6],
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "top",
        labels: { boxWidth: 35, boxHeight: 10, usePointStyle: false },
      },
      tooltip: { intersect: false, mode: "index" },
      title: { display: false },
    },
    interaction: { mode: "index", intersect: false },
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

/* ---------------- System Health Component (Dynamic) ---------------- */

function SystemHealthCard() {
  // DATA ARRAY: System Logs
  const systemLogs = [
    { label: "DB Connection", status: "OK", isSuccess: true },
    { label: "Sensor Relay", status: "Active", isSuccess: true },
    { label: "Last Sync", status: "Just now", isSuccess: false }, // false just removes green color
  ];

  return (
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

        <div className="text-uppercase small text-muted fw-bold mb-2">Logs</div>

        {systemLogs.map((log, index) => (
          <div
            key={index}
            className={`d-flex justify-content-between py-2 ${
              index !== systemLogs.length - 1 ? "border-bottom" : ""
            }`}
          >
            <span>{log.label}</span>
            <span className={log.isSuccess ? "text-success fw-bold" : "fw-semibold"}>
              {log.status}
            </span>
          </div>
        ))}
      </Card.Body>
    </Card>
  );
}

/* ---------------- Main Container ---------------- */

export function TrendsAndHealth() {
  // DATA ARRAYS: Chart Data
  // This logic is lifted up here so it can be controlled by state later
  const chartData = {
    labels: ["21:00", "21:01", "21:02", "21:03", "21:04", "21:05", "21:06", "21:07"],
    temp: [25.0, 24.6, 24.9, 24.7, 24.9, 25.0, 25.0, 24.8],
    humidity: [70.5, 69.7, 69.0, 69.5, 70.8, 71.0, 69.2, 70.6],
  };

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

            <EnvironmentalTrendsChart
              timeLabels={chartData.labels}
              temperatureData={chartData.temp}
              humidityData={chartData.humidity}
            />
          </Card.Body>
        </Card>
      </Col>

      <Col xl={4}>
        <SystemHealthCard />
      </Col>
    </Row>
  );
}