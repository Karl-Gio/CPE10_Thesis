import React, { useEffect, useMemo, useState } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Form,
  Alert,
  Spinner,
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
  fetchBatches,
  fetchMonitoringData,
  formatDisplayDate,
  formatNumber,
  buildChartData,
  buildStats,
  getMetricDomain,
} from "./monitoringHelpers";

import "./MonitoringMaintainability.css";

const MAX_POINTS = 120;

const METRIC_CONFIG = {
  ambient: {
    title: "Ambient Temperature",
    subtitle:
      "Actual readings against the target setpoint with tighter scaling.",
    actualKey: "ambientTemp",
    targetKey: "ambientTempTarget",
    actualColor: "#3b82f6",
    targetColor: "#f43f5e",
  },
  humidity: {
    title: "Relative Humidity",
    subtitle:
      "Small fluctuations are easier to evaluate for maintainability trends.",
    actualKey: "ambientHum",
    targetKey: "ambientHumTarget",
    actualColor: "#10b981",
    targetColor: "#f43f5e",
  },
  soilTemp: {
    title: "Soil Temperature",
    subtitle: "Focused range makes small control changes more visible.",
    actualKey: "soilTemp",
    targetKey: "soilTempTarget",
    actualColor: "#8b5cf6",
    targetColor: "#f43f5e",
  },
  soilMoisture: {
    title: "Soil Moisture",
    subtitle: "Consistency and variance are easier to inspect at a glance.",
    actualKey: "soilMoisture",
    targetKey: "soilMoistureTarget",
    actualColor: "#f97316",
    targetColor: "#f43f5e",
  },
};

export default function MonitoringMaintainability() {
  const [batches, setBatches] = useState([]);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [monitoringData, setMonitoringData] = useState(null);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingMonitoring, setLoadingMonitoring] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadBatches = async () => {
      try {
        setLoadingBatches(true);
        setError("");

        const data = await fetchBatches();
        setBatches(data);

        if (data.length > 0) {
          setSelectedBatch(data[0].batchId);
        }
      } catch (err) {
        console.error(err);
        setError("Failed to load batches.");
      } finally {
        setLoadingBatches(false);
      }
    };

    loadBatches();
  }, []);

  useEffect(() => {
    const loadMonitoring = async () => {
      if (!selectedBatch) return;

      try {
        setLoadingMonitoring(true);
        setError("");

        const data = await fetchMonitoringData(selectedBatch);
        setMonitoringData(data);
      } catch (err) {
        console.error(err);
        setError("Failed to load monitoring data.");
      } finally {
        setLoadingMonitoring(false);
      }
    };

    loadMonitoring();
  }, [selectedBatch]);

  const rawChartData = useMemo(
    () => buildChartData(monitoringData),
    [monitoringData]
  );

  const chartData = useMemo(() => {
    if (!Array.isArray(rawChartData)) return [];
    if (rawChartData.length <= MAX_POINTS) return rawChartData;

    const step = Math.ceil(rawChartData.length / MAX_POINTS);
    return rawChartData.filter((_, index) => index % step === 0);
  }, [rawChartData]);

  const stats = useMemo(() => buildStats(monitoringData), [monitoringData]);

  const ambientDomain = useMemo(
    () => getMetricDomain(chartData, "ambientTemp", "ambientTempTarget", 0.3),
    [chartData]
  );

  const humidityDomain = useMemo(
    () => getMetricDomain(chartData, "ambientHum", "ambientHumTarget", 0.5),
    [chartData]
  );

  const soilTempDomain = useMemo(
    () => getMetricDomain(chartData, "soilTemp", "soilTempTarget", 0.3),
    [chartData]
  );

  const soilMoistureDomain = useMemo(
    () =>
      getMetricDomain(
        chartData,
        "soilMoisture",
        "soilMoistureTarget",
        0.5
      ),
    [chartData]
  );

  const isLoading = loadingBatches || loadingMonitoring;

  return (
    <div className="mm-page">
      <Container fluid="xl" className="py-4 py-lg-5">
        <section className="mm-hero mb-4">
          <div className="mm-hero-copy">
            <div className="mm-eyebrow">System Monitoring</div>
            <h1 className="mm-title">Maintainability Dashboard</h1>
            <p className="mm-subtitle">
              Track target stability, detect micro-variance, and review batch
              performance in a cleaner operational view.
            </p>
          </div>

          <div className="mm-toolbar">
            <Form.Group>
              <Form.Label className="mm-label">Batch</Form.Label>
              <Form.Select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="mm-select"
                disabled={loadingBatches}
              >
                {Array.isArray(batches) &&
                  batches.map((batch) => (
                    <option key={batch.batchId} value={batch.batchId}>
                      {batch.batchId}
                    </option>
                  ))}
              </Form.Select>
            </Form.Group>
          </div>
        </section>

        {isLoading && (
          <Alert variant="light" className="mm-alert">
            <div className="mm-inline-status">
              <Spinner animation="border" size="sm" />
              <span>Loading monitoring data...</span>
            </div>
          </Alert>
        )}

        {error && (
          <Alert variant="danger" className="mm-alert">
            {error}
          </Alert>
        )}

        {monitoringData && !error && (
          <>
            <Row className="g-3 g-lg-4 mb-4">
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

            <Row className="g-3 g-lg-4 mb-4">
              <Col lg={6}>
                <Card className="mm-panel h-100">
                  <Card.Body className="p-4">
                    <div className="mm-panel-head">
                      <div>
                        <div className="mm-panel-kicker">Overview</div>
                        <h3 className="mm-panel-title">Batch Information</h3>
                      </div>
                    </div>

                    <div className="mm-info-list">
                      <InfoRow label="Batch Number" value={monitoringData.batchId} />
                      <InfoRow
                        label="Date Planted"
                        value={formatDisplayDate(monitoringData.datePlanted)}
                      />
                      <InfoRow
                        label="Date of Germination"
                        value={
                          monitoringData.germinationDate
                            ? formatDisplayDate(monitoringData.germinationDate)
                            : "Not yet germinated"
                        }
                      />
                    </div>
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

                      <div className="mm-info-list">
                        <InfoRow
                          label="Ambient Temperature"
                          value={monitoringData.target.ambientTemp}
                        />
                        <InfoRow
                          label="Relative Humidity"
                          value={monitoringData.target.ambientHum}
                        />
                        <InfoRow
                          label="Soil Temperature"
                          value={monitoringData.target.soilTemp}
                        />
                        <InfoRow
                          label="Soil Moisture"
                          value={monitoringData.target.soilMoisture}
                        />
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>

            <Row className="g-3 g-lg-4">
              <Col xl={6}>
                <MetricChart
                  title={METRIC_CONFIG.ambient.title}
                  subtitle={METRIC_CONFIG.ambient.subtitle}
                  data={chartData}
                  actualKey={METRIC_CONFIG.ambient.actualKey}
                  targetKey={METRIC_CONFIG.ambient.targetKey}
                  actualColor={METRIC_CONFIG.ambient.actualColor}
                  targetColor={METRIC_CONFIG.ambient.targetColor}
                  domain={ambientDomain}
                />
              </Col>

              <Col xl={6}>
                <MetricChart
                  title={METRIC_CONFIG.humidity.title}
                  subtitle={METRIC_CONFIG.humidity.subtitle}
                  data={chartData}
                  actualKey={METRIC_CONFIG.humidity.actualKey}
                  targetKey={METRIC_CONFIG.humidity.targetKey}
                  actualColor={METRIC_CONFIG.humidity.actualColor}
                  targetColor={METRIC_CONFIG.humidity.targetColor}
                  domain={humidityDomain}
                />
              </Col>

              <Col xl={6}>
                <MetricChart
                  title={METRIC_CONFIG.soilTemp.title}
                  subtitle={METRIC_CONFIG.soilTemp.subtitle}
                  data={chartData}
                  actualKey={METRIC_CONFIG.soilTemp.actualKey}
                  targetKey={METRIC_CONFIG.soilTemp.targetKey}
                  actualColor={METRIC_CONFIG.soilTemp.actualColor}
                  targetColor={METRIC_CONFIG.soilTemp.targetColor}
                  domain={soilTempDomain}
                />
              </Col>

              <Col xl={6}>
                <MetricChart
                  title={METRIC_CONFIG.soilMoisture.title}
                  subtitle={METRIC_CONFIG.soilMoisture.subtitle}
                  data={chartData}
                  actualKey={METRIC_CONFIG.soilMoisture.actualKey}
                  targetKey={METRIC_CONFIG.soilMoisture.targetKey}
                  actualColor={METRIC_CONFIG.soilMoisture.actualColor}
                  targetColor={METRIC_CONFIG.soilMoisture.targetColor}
                  domain={soilMoistureDomain}
                />
              </Col>
            </Row>
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
      <Card.Body className="p-4">
        <div className="mm-stat-label">{label}</div>
        <div className="mm-stat-value">{value}</div>
      </Card.Body>
    </Card>
  );
}

const MetricChart = React.memo(function MetricChart({
  title,
  subtitle,
  data,
  actualKey,
  targetKey,
  actualColor,
  targetColor,
  domain,
}) {
  return (
    <Card className="mm-panel mm-chart-card h-100">
      <Card.Body className="p-4">
        <div className="mm-panel-head mm-panel-head-chart mb-3">
          <div>
            <div className="mm-panel-kicker">Metric Trend</div>
            <h3 className="mm-panel-title">{title}</h3>
            <p className="mm-panel-subtitle mb-0">{subtitle}</p>
          </div>
        </div>

        <div className="mm-chart-wrap">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid
                stroke="#e2e8f0"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="shortTime"
                interval="preserveStartEnd"
                minTickGap={28}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                tickFormatter={formatNumber}
                domain={domain}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend className="mm-chart-legend" />
              <Line
                type="monotone"
                dataKey={actualKey}
                name="Actual"
                stroke={actualColor}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey={targetKey}
                name="Target"
                stroke={targetColor}
                strokeWidth={2}
                strokeDasharray="6 6"
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card.Body>
    </Card>
  );
});

const CustomTooltip = React.memo(function CustomTooltip({
  active,
  payload,
  label,
}) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div className="mm-tooltip">
      <div className="mm-tooltip-title">{label}</div>

      {payload.map((entry, index) => (
        <div key={index} className="mm-tooltip-item">
          <span
            className="mm-tooltip-dot"
            style={{ backgroundColor: entry.color }}
          />
          <span className="mm-tooltip-name">{entry.name}</span>
          <strong className="mm-tooltip-value">
            {formatNumber(entry.value)}
          </strong>
        </div>
      ))}
    </div>
  );
});