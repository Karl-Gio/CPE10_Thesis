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

const HEATMAP_METRICS = [
  {
    key: "ambientTemp",
    label: "Ambient Temp",
    targetKey: "ambientTemp",
    unit: "°C",
    scale: 3,
  },
  {
    key: "ambientHum",
    label: "Humidity",
    targetKey: "ambientHum",
    unit: "%",
    scale: 5,
  },
  {
    key: "soilTemp",
    label: "Soil Temp",
    targetKey: "soilTemp",
    unit: "°C",
    scale: 3,
  },
  {
    key: "soilMoisture",
    label: "Soil Moisture",
    targetKey: "soilMoisture",
    unit: "%",
    scale: 5,
  },
];

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
    [monitoringData],
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
    [chartData],
  );

  const humidityDomain = useMemo(
    () => getMetricDomain(chartData, "ambientHum", "ambientHumTarget", 0.5),
    [chartData],
  );

  const soilTempDomain = useMemo(
    () => getMetricDomain(chartData, "soilTemp", "soilTempTarget", 0.3),
    [chartData],
  );

  const soilMoistureDomain = useMemo(
    () => getMetricDomain(chartData, "soilMoisture", "soilMoistureTarget", 0.5),
    [chartData],
  );

  const isLoading = loadingBatches || loadingMonitoring;

  return (
    <div className="mm-page">
      <Container fluid="xl" className="mm-shell py-4 py-xl-5">
        <section className="mm-hero mb-4">
          <div className="mm-hero-copy">
            <span className="mm-eyebrow">System Monitoring</span>
            <h1 className="mm-title">Maintainability Dashboard</h1>
            <p className="mm-subtitle">
              Track target stability, detect micro-variance, and review batch
              performance in a cleaner operational view.
            </p>
          </div>

          <div className="mm-toolbar">
            <Form.Group className="mm-filter-group">
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
          <Alert variant="light" className="mm-alert mm-alert-soft">
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
            <Row className="g-3 g-xl-4 mb-4">
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

            <Row className="g-3 g-xl-4 mb-4">
              <Col lg={6}>
                <Card className="mm-panel h-100">
                  <Card.Body className="mm-card-body">
                    <div className="mm-panel-head">
                      <div>
                        <div className="mm-panel-kicker">Overview</div>
                        <h3 className="mm-panel-title">Batch Information</h3>
                      </div>
                    </div>

                    <div className="mm-info-list">
                      <InfoRow
                        label="Batch Number"
                        value={monitoringData.batchId}
                      />
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
                    <Card.Body className="mm-card-body">
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

            <Row className="g-3 g-xl-4">
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

            <Row className="g-3 g-xl-4 mt-1">
              <Col xs={12}>
                <BatchHeatMap monitoringData={monitoringData} />
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
    <Card className={`mm-stat mm-stat-${tone} h-100`}>
      <Card.Body className="mm-card-body">
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
      <Card.Body className="mm-card-body">
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
                stroke="#e7edf5"
                strokeDasharray="3 3"
                vertical={false}
              />
              <XAxis
                dataKey="shortTime"
                interval="preserveStartEnd"
                minTickGap={28}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#7c8aa5" }}
              />
              <YAxis
                tickFormatter={formatNumber}
                domain={domain}
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#7c8aa5" }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend className="mm-chart-legend" />
              <Line
                type="monotone"
                dataKey={actualKey}
                name="Actual"
                stroke={actualColor}
                strokeWidth={2.4}
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
            className={`mm-tooltip-dot ${getTooltipDotClass(entry.color)}`}
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

function BatchHeatMap({ monitoringData }) {
  const history = monitoringData?.history ?? [];
  const target = monitoringData?.target ?? null;

  const heatMapRows = useMemo(() => {
    if (!history.length || !target) return [];

    return history.map((row, index) => ({
      id: row.timestamp ?? `row-${index}`,
      label: row.timestamp
        ? new Date(row.timestamp).toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })
        : `Point ${index + 1}`,
      cells: HEATMAP_METRICS.map((metric) => {
        const actual = row?.[metric.key];
        const targetValue = target?.[metric.targetKey];
        const delta = getAbsoluteDeviation(actual, targetValue);
        const normalizedScore = getNormalizedScore(delta, metric.scale);

        return {
          metricKey: metric.key,
          metricLabel: metric.label,
          actual,
          target: targetValue,
          delta,
          normalizedScore,
          colorClass: getHeatClass(normalizedScore),
          unit: metric.unit,
        };
      }),
    }));
  }, [history, target]);

  if (!history.length || !target) return null;

  return (
    <Card className="mm-panel">
      <Card.Body className="mm-card-body">
        <div className="mm-panel-head mb-3">
          <div>
            <div className="mm-panel-kicker">Whole Batch View</div>
            <h3 className="mm-panel-title">Environmental Deviation Heat Map</h3>
            <p className="mm-panel-subtitle mb-0">
              Each cell shows how far a recorded value is from its batch target.
              Green means closer to target; warmer colors indicate larger drift.
            </p>
          </div>
        </div>

        <div className="mm-heatmap-legend mb-3">
          <LegendPill label="Very close" className="hm-very-low" />
          <LegendPill label="Low drift" className="hm-low" />
          <LegendPill label="Moderate drift" className="hm-medium" />
          <LegendPill label="High drift" className="hm-high" />
          <LegendPill label="Critical drift" className="hm-critical" />
          <LegendPill label="No data" className="hm-empty" />
        </div>

        <div className="mm-heatmap-scroll">
          <div className="mm-heatmap-grid mm-heatmap-grid-4">
            <div className="mm-heatmap-head">Timestamp</div>
            {HEATMAP_METRICS.map((metric) => (
              <div key={metric.key} className="mm-heatmap-head">
                {metric.label}
              </div>
            ))}

            {heatMapRows.map((row) => (
              <React.Fragment key={row.id}>
                <div className="mm-heatmap-time">{row.label}</div>

                {row.cells.map((cell) => (
                  <div
                    key={`${row.id}-${cell.metricKey}`}
                    className={`mm-heatmap-cell ${cell.colorClass}`}
                    title={`${cell.metricLabel}
Actual: ${displayMetricValue(cell.actual, cell.unit)}
Target: ${displayMetricValue(cell.target, cell.unit)}
Deviation: ${displayMetricValue(cell.delta, cell.unit)}`}
                  >
                    <div className="mm-heatmap-value">
                      {displayMetricValue(cell.actual, cell.unit)}
                    </div>
                    <div className="mm-heatmap-meta">
                      tgt {displayMetricValue(cell.target, cell.unit)}
                    </div>
                    <div className="mm-heatmap-delta">
                      Δ {displayMetricValue(cell.delta, cell.unit)}
                    </div>
                  </div>
                ))}
              </React.Fragment>
            ))}
          </div>
        </div>
      </Card.Body>
    </Card>
  );
}

function LegendPill({ label, className }) {
  return (
    <div className="mm-legend-pill">
      <span className={`mm-legend-swatch ${className}`} />
      <span>{label}</span>
    </div>
  );
}

function getAbsoluteDeviation(actual, target) {
  if (
    typeof actual !== "number" ||
    !Number.isFinite(actual) ||
    typeof target !== "number" ||
    !Number.isFinite(target)
  ) {
    return null;
  }

  return Math.abs(actual - target);
}

function getNormalizedScore(deviation, scale = 1) {
  if (
    typeof deviation !== "number" ||
    !Number.isFinite(deviation) ||
    typeof scale !== "number" ||
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    return null;
  }

  return Math.min(deviation / scale, 1);
}

function getHeatClass(score) {
  if (score == null) return "hm-empty";
  if (score <= 0.15) return "hm-very-low";
  if (score <= 0.35) return "hm-low";
  if (score <= 0.6) return "hm-medium";
  if (score <= 0.85) return "hm-high";
  return "hm-critical";
}

function displayMetricValue(value, unit = "") {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `${value.toFixed(3)}${unit ? ` ${unit}` : ""}`;
}

function getTooltipDotClass(color) {
  switch (color) {
    case "#3b82f6":
      return "is-blue";
    case "#10b981":
      return "is-green";
    case "#8b5cf6":
      return "is-violet";
    case "#f97316":
      return "is-orange";
    case "#f43f5e":
      return "is-rose";
    default:
      return "";
  }
}