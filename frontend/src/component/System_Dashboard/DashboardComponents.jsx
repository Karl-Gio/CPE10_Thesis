
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Badge from "react-bootstrap/Badge";
import Stack from "react-bootstrap/Stack";
import React, { useState, useEffect } from "react";
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

//* ---------------- Reusable Metric Card (Updated) ---------------- */
function MetricCard({ title, value, badgeText, subLeft, icon, extraValue, extraTitle }) {
  return (
    <Card className="shadow-sm h-100 border-0 rounded-4">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="text-uppercase small text-muted fw-bold">{title}</div>
          <div className="bg-light d-flex align-items-center justify-content-center" style={{ width: 34, height: 34, borderRadius: 10 }}>
            {icon}
          </div>
        </div>
        
        <div className="d-flex align-items-end gap-4">
          {/* Main Value (Intensity) */}
          <div>
            <div className="fs-3 fw-bold">{value}</div>
          </div>

          {/* UV Duration (Visible only if extraValue is provided) */}
          {extraValue !== undefined && (
            <div className="border-start ps-3 pb-1">
              <div className="text-uppercase text-muted fw-bold" style={{ fontSize: '10px', letterSpacing: '0.5px' }}>
                {extraTitle}
              </div>
              <div className="fw-bold text-primary" style={{ fontSize: '1.1rem' }}>
                {extraValue} <span className="small fw-normal text-muted">mins</span>
              </div>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 mt-2">
          {badgeText && (
            <Badge bg={badgeText === "Warning" || badgeText === "Dry" ? "danger" : "success"} className="bg-opacity-25 text-dark border">
              {badgeText}
            </Badge>
          )}
          <small className="text-muted">{subLeft}</small>
        </div>
      </Card.Body>
    </Card>
  );
}

/* ----------------/* ---------------- Metric Grid (Dynamic) ---------------- */
export function MetricGrid() {
  const [liveData, setLiveData] = useState({
    temp: 0, hum: 0, lux: 0, sMOIST: 0, sTEMP: 0, pechay_detected: 0
  });
  
  // State para sa UV Duration galing sa Config
  const [uvDuration, setUvDuration] = useState(0);

  useEffect(() => {
    // 1. Fetch Config once (o pwede ring i-interval kung nagbabago madalas)
    const fetchConfig = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch("http://localhost:8000/api/configurations/active", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data) setUvDuration(data.uvDuration || 0);
      } catch (err) {
        console.error("Config Fetch Error:", err);
      }
    };

    // 2. Fetch Sensor Data (Interval)
    const fetchStats = async () => {
      try {
        const res = await fetch("/api_python/status");
        if (!res.ok) throw new Error("Network response was not ok");
        const data = await res.json();
        setLiveData(data);
      } catch (err) {
        console.error("Hardware API Error:", err.message);
      }
    };

    fetchConfig();
    fetchStats();
    const interval = setInterval(fetchStats, 2000); 
    return () => clearInterval(interval);
  }, []);

  const sensorMetrics = [
    { title: "Ambient Temp", value: `${(liveData.temp || 0).toFixed(2)}°C`, icon: "🌡️" },
    { title: "Ambient Hum", value: `${(liveData.hum || 0).toFixed(2)}%`, icon: "💧" },
    { 
      title: "Light Intensity", 
      value: `${(liveData.lux || 0).toFixed(0)} lx`, 
      icon: "☀️",
      extraTitle: "UV Duration",  // Label para sa UV
      extraValue: uvDuration      // Ang value galing sa config
    },
    { title: "Soil Temp", value: `${(liveData.sTEMP || 0).toFixed(2)}°C`, icon: "🏜️" },
    { title: "Soil Moisture", value: `${(liveData.sMOIST || 0).toFixed(2)}%`, icon: "🌱" },
    { title: "Pechay Count", value: liveData.pechay_detected || 0, badgeText: "Live", subLeft: "YOLOv8", icon: "🥬" },
  ];

  return (
    <Row className="g-3 mb-3">
      {sensorMetrics.map((metric, index) => (
        <Col key={index} md={6} xl={4}>
          <MetricCard {...metric} />
        </Col>
      ))}
    </Row>
  );
}

/* ---------------- Trends Chart ---------------- */
export function EnvironmentalTrendsChart({ timeLabels, temperatureData, humidityData }) {
  const data = {
    labels: timeLabels,
    datasets: [
      { label: "Temp (°C)", data: temperatureData, borderColor: "#00b37a", tension: 0.35, pointRadius: 0 },
      { label: "Hum (%)", data: humidityData, borderColor: "#2f6bff", borderDash: [6, 6], tension: 0.35, pointRadius: 0 },
    ],
  };

  return (
    <div className="bg-white rounded border" style={{ height: 280, padding: 12 }}>
      <Line data={data} options={{ responsive: true, maintainAspectRatio: false }} />
    </div>
  );
}

/* ---------------- System Health ---------------- */
export function SystemHealthCard() {
  return (
    <Card className="shadow-sm h-100 border-0 rounded-4">
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
        <div className="d-flex justify-content-between py-2 border-bottom">
          <span>Hardware Interface</span>
          <span className="text-success fw-bold">Connected</span>
        </div>
        <div className="d-flex justify-content-between py-2">
          <span>AI Inference</span>
          <span className="text-success fw-bold">Active</span>
        </div>
      </Card.Body>
    </Card>
  );
}

/* ---------------- Main Container ---------------- */
export function TrendsAndHealth() {
  const chartData = {
    labels: ["16:00", "16:01", "16:02", "16:03", "16:04", "16:05"],
    temp: [25.0, 24.8, 25.1, 24.9, 25.0, 25.2],
    humidity: [70, 69, 71, 70, 68, 70],
  };

  return (
    <Row className="g-3">
      <Col xl={8}>
        <Card className="shadow-sm h-100 border-0 rounded-4">
          <Card.Body>
            <h5 className="mb-3 fw-bold">Environmental Trends</h5>
            <EnvironmentalTrendsChart timeLabels={chartData.labels} temperatureData={chartData.temp} humidityData={chartData.humidity} />
          </Card.Body>
        </Card>
      </Col>
      <Col xl={4}><SystemHealthCard /></Col>
    </Row>
  );
}