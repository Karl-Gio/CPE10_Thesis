import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Alert,
  Spinner,
  Badge,
} from "react-bootstrap";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import {
  getAuthConfig,
  formatDisplayDate,
  formatNumber,
  buildChartData,
  buildStats,
} from "./monitoringHelpers";

import "./MonitoringMaintainability.css";

const API = "http://localhost:8000/api";

export default function MonitoringMaintainability() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [monitoringData, setMonitoringData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchBatches();
  }, []);

  useEffect(() => {
    if (selectedBatch) {
      fetchMonitoringData(selectedBatch);
    }
  }, [selectedBatch]);

  const fetchBatches = async () => {
    try {
      setError("");
      const res = await axios.get(`${API}/batches`, getAuthConfig());
      const data = Array.isArray(res.data) ? res.data : res.data.data ?? [];
      setBatches(data);

      if (data.length > 0) {
        setSelectedBatch(data[0].batch_id);
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load batches.");
    }
  };

  const fetchMonitoringData = async (batchId) => {
    try {
      setLoading(true);
      setError("");
      const res = await axios.get(`${API}/monitoring/${batchId}`, getAuthConfig());
      setMonitoringData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load monitoring data.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => buildChartData(monitoringData), [monitoringData]);
  const stats = useMemo(() => buildStats(monitoringData), [monitoringData]);

  return (
    <div className="mm-page">
      <Container fluid="xl" className="py-4 py-lg-5">
        <section className="mm-hero mb-4 mb-lg-5">
          <div>
            <div className="mm-eyebrow">System Monitoring</div>
            <h1 className="mm-title">Maintainability Dashboard</h1>
            <p className="mm-subtitle">
              Track target stability, detect micro-variance, and review batch
              performance with a cleaner operational view.
            </p>
          </div>

          <div className="mm-toolbar">
            <Form.Group className="mm-select-group">
              <Form.Label className="mm-label">Batch</Form.Label>
              <Form.Select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="mm-select"
              >
                {Array.isArray(batches) &&
                  batches.map((batch) => (
                    <option key={batch.batch_id} value={batch.batch_id}>
                      {batch.batch_id}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </div>
        </section>

        {loading && (
          <Alert variant="light" className="mm-alert">
            <Spinner animation="border" size="sm" className="me-2" />
            Loading monitoring data...
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mm-alert">
            {error}
          </Alert>
        )}

        {monitoringData && (
          <>
            <Row className="g-4 mb-4">
              <Col md={6} xl={3}>
                <StatCard
                  label="System Status"
                  value={stats.overallInterpretation}
                  tone="success"
                />
              </Col>
              <Col md={6} xl={3}>
                <StatCard
                  label="Average Variance"
                  value={stats.avgVariance.toFixed(3)}
                  tone="primary"
                />
              </Col>
              <Col md={6} xl={3}>
                <StatCard
                  label="Highest Variance"
                  value={stats.maxVariance.toFixed(3)}
                  tone="violet"
                />
              </Col>
              <Col md={6} xl={3}>
                <StatCard
                  label="Data Points"
                  value={String(monitoringData.history?.length ?? 0)}
                  tone="orange"
                />
              </Col>
            </Row>

            <Row className="g-4 mb-4">
              <Col lg={6}>
                <Card className="mm-panel h-100">
                  <Card.Body className="p-4">
                    <div className="mm-panel-head">
                      <div>
                        <div className="mm-panel-kicker">Overview</div>
                        <h3 className="mm-panel-title">Batch Information</h3>
                      </div>
                      <Badge bg="light" text="dark" className="mm-badge">
                        Active Batch
                      </Badge>
                    </div>

                    <InfoRow label="Batch Number" value={monitoringData.batch_id} />
                    <InfoRow
                      label="Date Planted"
                      value={formatDisplayDate(monitoringData.date_planted)}
                    />
                    <InfoRow
                      label="Date of Germination"
                      value={
                        monitoringData.germination_date
                          ? formatDisplayDate(monitoringData.germination_date)
                          : "Not yet germinated"
                      }
                    />
                  </Card.Body>
                </Card>
              </Col>

              {monitoringData.target && (
                <Col lg={6}>
                  <Card className="mm-panel h-100">
                    <Card.Body className="p-4">
                      <div className="mm-panel-head">
                        <div>
                          <div className="mm-panel-kicker">Reference</div>
                          <h3 className="mm-panel-title">Target Setpoints</h3>
                        </div>
                      </div>

                      <InfoRow
                        label="Ambient Temperature"
                        value={monitoringData.target.ambientTemp}
                      />
                      <InfoRow
                        label="Relative Humidity"
                        value={monitoringData.target.humidity}
                      />
                      <InfoRow
                        label="Soil Temperature"
                        value={monitoringData.target.soilTemp}
                      />
                      <InfoRow
                        label="Soil Moisture"
                        value={monitoringData.target.soilMoisture}
                      />
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>

            <ChartCard
              title="Ambient Temperature"
              subtitle="Shows actual readings against the target setpoint with tighter visual scaling."
            >
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27344922" />
                  <XAxis
                    dataKey="shortTime"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fill: "#64748b" }}
                    domain={
                      monitoringData?.target
                        ? [
                            monitoringData.target.ambientTemp - 1.2,
                            monitoringData.target.ambientTemp + 1.2,
                          ]
                        : ["auto", "auto"]
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="ambient_temp_ex"
                    name="Actual"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ambient_target"
                    name="Target"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Relative Humidity"
              subtitle="Makes small fluctuations easier to evaluate for maintainability trends."
            >
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27344922" />
                  <XAxis
                    dataKey="shortTime"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fill: "#64748b" }}
                    domain={
                      monitoringData?.target
                        ? [
                            monitoringData.target.humidity - 1.2,
                            monitoringData.target.humidity + 1.2,
                          ]
                        : ["auto", "auto"]
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="humidity_ex"
                    name="Actual"
                    stroke="#10b981"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="humidity_target"
                    name="Target"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Soil Temperature"
              subtitle="Highlights tight environmental control with a more focused view."
            >
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27344922" />
                  <XAxis
                    dataKey="shortTime"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fill: "#64748b" }}
                    domain={
                      monitoringData?.target
                        ? [
                            monitoringData.target.soilTemp - 1.2,
                            monitoringData.target.soilTemp + 1.2,
                          ]
                        : ["auto", "auto"]
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="soil_temp_ex"
                    name="Actual"
                    stroke="#8b5cf6"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="soil_temp_target"
                    name="Target"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>

            <ChartCard
              title="Soil Moisture"
              subtitle="Tighter scaling surfaces consistency and variance more clearly."
            >
              <ResponsiveContainer width="100%" height={340}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27344922" />
                  <XAxis
                    dataKey="shortTime"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval="preserveStartEnd"
                    minTickGap={28}
                  />
                  <YAxis
                    tickFormatter={formatNumber}
                    tick={{ fill: "#64748b" }}
                    domain={
                      monitoringData?.target
                        ? [
                            monitoringData.target.soilMoisture - 1.2,
                            monitoringData.target.soilMoisture + 1.2,
                          ]
                        : ["auto", "auto"]
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="soil_moisture_ex"
                    name="Actual"
                    stroke="#f97316"
                    strokeWidth={3}
                    dot={false}
                    activeDot={{ r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="soil_moisture_target"
                    name="Target"
                    stroke="#f43f5e"
                    strokeWidth={2}
                    strokeDasharray="6 6"
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartCard>
          </>
        )}
      </Container>
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="mm-info-row">
      <span className="mm-info-label">{label}</span>
      <span className="mm-info-value">{value}</span>
    </div>
  );
}

function StatCard({ label, value, tone = "primary" }) {
  return (
    <Card className={`mm-stat mm-stat-${tone}`}>
      <Card.Body>
        <div className="mm-stat-label">{label}</div>
        <div className="mm-stat-value">{value}</div>
      </Card.Body>
    </Card>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <Card className="mm-panel mm-chart-card mb-4">
      <Card.Body className="p-4">
        <div className="mm-panel-head mb-3">
          <div>
            <div className="mm-panel-kicker">Metric Trend</div>
            <h3 className="mm-panel-title">{title}</h3>
            <p className="mm-panel-subtitle mb-0">{subtitle}</p>
          </div>
        </div>
        {children}
      </Card.Body>
    </Card>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="mm-tooltip">
      <div className="mm-tooltip-title">{label}</div>
      {payload.map((entry, index) => (
        <div key={index} className="mm-tooltip-item" style={{ color: entry.color }}>
          {entry.name}: <strong>{formatNumber(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}