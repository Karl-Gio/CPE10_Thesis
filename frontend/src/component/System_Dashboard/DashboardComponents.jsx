import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Card from "react-bootstrap/Card";
import Badge from "react-bootstrap/Badge";
import Stack from "react-bootstrap/Stack";
import Spinner from "react-bootstrap/Spinner";
import Alert from "react-bootstrap/Alert";
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
import {
  fetchEnvironmentalTrends,
  fetchLatestStats,
  fetchActiveConfig,
} from "./dashboardHelpers";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

function MetricCard({
  title,
  value,
  badgeText,
  subLeft,
  icon,
  extraValue,
  extraTitle,
}) {
  const badgeVariant =
    badgeText === "Warning" || badgeText === "Dry" ? "danger" : "success";

  return (
    <Card className="dw-card shadow-sm h-100 border-0 rounded-4 mt-2">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div className="dw-card-title text-uppercase small text-muted fw-bold">
            {title}
          </div>

          <div className="dw-icon-wrap bg-light d-flex align-items-center justify-content-center">
            <span className="dw-icon">{icon}</span>
          </div>
        </div>

        <div className="d-flex align-items-end gap-4">
          <div>
            <div className="fs-3 fw-bold">{value}</div>
          </div>

          {extraValue !== undefined && (
            <div className="dw-extra-block border-start ps-3 pb-1">
              <div className="dw-extra-title text-uppercase text-muted fw-bold">
                {extraTitle}
              </div>
              <div className="dw-extra-value fw-bold text-primary">
                {extraValue}{" "}
                <span className="small fw-normal text-muted">mins</span>
              </div>
            </div>
          )}
        </div>

        <div className="d-flex align-items-center gap-2 mt-2">
          {badgeText && (
            <Badge
              bg={badgeVariant}
              className="dw-badge bg-opacity-25 text-dark border"
            >
              {badgeText}
            </Badge>
          )}
          <small className="text-muted">{subLeft}</small>
        </div>
      </Card.Body>
    </Card>
  );
}

export function MetricGrid() {
  const [liveData, setLiveData] = useState({
    temp: 0,
    hum: 0,
    lux: 0,
    sMOIST: 0,
    sTEMP: 0,
    pechay_detected: 0,
    batch: null,
    created_at: null,
  });

  const [uvDuration, setUvDuration] = useState(0);

  useEffect(() => {
    const loadData = async () => {
      const uv = await fetchActiveConfig();
      setUvDuration(uv);

      const stats = await fetchLatestStats();
      if (stats) setLiveData(stats);
    };

    loadData();

    const interval = setInterval(async () => {
      const stats = await fetchLatestStats();
      if (stats) setLiveData(stats);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const sensorMetrics = [
    {
      title: "Ambient Temp",
      value: `${Number(liveData.temp || 0).toFixed(2)}°C`,
      icon: "🌡️",
    },
    {
      title: "Ambient Hum",
      value: `${Number(liveData.hum || 0).toFixed(2)}%`,
      icon: "💧",
    },
    {
      title: "Light Intensity",
      value: `${Number(liveData.lux || 0).toFixed(0)} lx`,
      icon: "☀️",
      extraTitle: "UV Duration",
      extraValue: uvDuration,
    },
    {
      title: "Soil Temp",
      value: `${Number(liveData.sTEMP || 0).toFixed(2)}°C`,
      icon: "🏜️",
    },
    {
      title: "Soil Moisture",
      value: `${Number(liveData.sMOIST || 0).toFixed(2)}%`,
      icon: "🌱",
    },
    {
      title: "Pechay Count",
      value: liveData.pechay_detected || 0,
      badgeText: "Live",
      icon: "🥬",
    },
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

export function EnvironmentalTrendsChart({
  timeLabels,
  temperatureData,
  humidityData,
  soilTempData,
  soilMoistureData,
  lightData,
}) {
  const data = {
    labels: timeLabels,
    datasets: [
      {
        label: "Temp (°C)",
        data: temperatureData,
        borderColor: "#00b37a",
        backgroundColor: "#00b37a",
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: "Humidity (%)",
        data: humidityData,
        borderColor: "#2f6bff",
        backgroundColor: "#2f6bff",
        borderDash: [6, 6],
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: "Soil Temp (°C)",
        data: soilTempData,
        borderColor: "#ff8c00",
        backgroundColor: "#ff8c00",
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: "Soil Moisture (%)",
        data: soilMoistureData,
        borderColor: "#8b5cf6",
        backgroundColor: "#8b5cf6",
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2,
      },
      {
        label: "Light Intensity (lx)",
        data: lightData,
        borderColor: "#facc15",
        backgroundColor: "#facc15",
        tension: 0.35,
        pointRadius: 2,
        borderWidth: 2,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      mode: "index",
      intersect: false,
    },
    plugins: {
      legend: {
        position: "top",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          color: "#475569",
          font: {
            size: 11,
            weight: "600",
          },
        },
      },
      tooltip: {
        backgroundColor: "#0f172a",
        titleColor: "#e2e8f0",
        bodyColor: "#ffffff",
        borderColor: "rgba(255,255,255,0.08)",
        borderWidth: 1,
        padding: 12,
        displayColors: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: "#64748b",
          maxRotation: 0,
          autoSkip: true,
        },
        border: {
          display: false,
        },
      },
      y: {
        grid: {
          color: "#e2e8f0",
        },
        ticks: {
          color: "#64748b",
        },
        border: {
          display: false,
        },
      },
    },
  };

  return (
    <div className="dw-chart-wrap bg-white rounded border">
      <Line data={data} options={options} />
    </div>
  );
}

export function SystemHealthCard({ trendsLoading, trendsError, latestTimestamp }) {
  const isOperational = !trendsError;

  return (
    <Card className="dw-card shadow-sm h-100 border-0 rounded-4">
      <Card.Body>
        <h5 className="mb-3 fw-bold">System Health</h5>

        <div
          className={`dw-health-box p-3 rounded mb-3 border ${
            isOperational
              ? "bg-success bg-opacity-10 border-success border-opacity-25"
              : "bg-danger bg-opacity-10 border-danger border-opacity-25"
          }`}
        >
          <Stack direction="horizontal" gap={2}>
            <span className={isOperational ? "text-success" : "text-danger"}>
              ●
            </span>
            <div>
              <div
                className={`fw-bold ${
                  isOperational ? "text-success" : "text-danger"
                }`}
              >
                {isOperational ? "System Operational" : "System Issue Detected"}
              </div>
              <div className="small text-muted">
                {isOperational
                  ? "Trend endpoint responding normally"
                  : "Unable to load trend data"}
              </div>
            </div>
          </Stack>
        </div>

        <div className="text-uppercase small text-muted fw-bold mb-2">Logs</div>

        <div className="d-flex justify-content-between py-2 border-bottom">
          <span>Trend API</span>
          <span className={isOperational ? "text-success fw-bold" : "text-danger fw-bold"}>
            {trendsLoading ? "Loading..." : isOperational ? "Connected" : "Disconnected"}
          </span>
        </div>

        <div className="d-flex justify-content-between py-2 border-bottom">
          <span>AI Inference</span>
          <span className="text-success fw-bold">Active</span>
        </div>

        <div className="d-flex justify-content-between py-2">
          <span>Latest Trend Point</span>
          <span className="text-muted fw-bold">{latestTimestamp || "No data"}</span>
        </div>
      </Card.Body>
    </Card>
  );
}

export function TrendsAndHealth() {
  const [chartData, setChartData] = useState({
    labels: [],
    temp: [],
    humidity: [],
    soilMoisture: [],
    soilTemp: [],
    light: [],
    pechayCount: [],
  });

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadTrends = async () => {
      try {
        if (!loading) setError("");

        const data = await fetchEnvironmentalTrends();

        setChartData(data);
        setError("");
      } catch (err) {
        console.error(err);
        setError("Could not load environmental trends.");
      } finally {
        setLoading(false);
      }
    };

    loadTrends();

    const interval = setInterval(loadTrends, 5000);

    return () => clearInterval(interval);
  }, [loading]);

  const latestLabel =
    chartData.labels.length > 0 ? chartData.labels[chartData.labels.length - 1] : null;

  return (
    <Row className="g-3">
      <Col xl={8}>
        <Card className="dw-card shadow-sm h-100 border-0 rounded-4">
          <Card.Body>
            <h5 className="mb-3 fw-bold">Environmental Trends</h5>

            {loading ? (
              <div className="dw-chart-loading d-flex justify-content-center align-items-center">
                <Spinner animation="border" variant="success" />
              </div>
            ) : error ? (
              <Alert variant="danger" className="mb-0">
                {error}
              </Alert>
            ) : (
              <EnvironmentalTrendsChart
                timeLabels={chartData.labels}
                temperatureData={chartData.temp}
                humidityData={chartData.humidity}
                soilTempData={chartData.soilTemp}
                soilMoistureData={chartData.soilMoisture}
                lightData={chartData.light}
              />
            )}
          </Card.Body>
        </Card>
      </Col>

      <Col xl={4}>
        <SystemHealthCard
          trendsLoading={loading}
          trendsError={error}
          latestTimestamp={latestLabel}
        />
      </Col>
    </Row>
  );
}