import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
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

const API = "http://localhost:8000/api";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

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

      const res = await axios.get(
        `${API}/monitoring/${batchId}`,
        getAuthConfig()
      );

      setMonitoringData(res.data);
    } catch (err) {
      console.error(err);
      setError("Failed to load monitoring data.");
    } finally {
      setLoading(false);
    }
  };

  const chartData = useMemo(() => {
    if (!monitoringData?.history || !monitoringData?.target) return [];

    const target = monitoringData.target;

    return monitoringData.history.map((row, index) => ({
      index: index + 1,
      shortTime: new Date(row.timestamp).toLocaleString("en-PH", {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }),
      fullTime: new Date(row.timestamp).toLocaleString("en-PH"),
      ambient_temp: row.ambient_temp,
      ambient_target: target.ambientTemp,
      humidity: row.humidity,
      humidity_target: target.humidity,
      soil_temp: row.soil_temp,
      soil_temp_target: target.soilTemp,
      soil_moisture: row.soil_moisture,
      soil_moisture_target: target.soilMoisture,
      light: row.light,
      pechay_count: row.pechay_count,

      // exaggerated display values
      ambient_temp_ex:
        target.ambientTemp + (row.ambient_temp - target.ambientTemp) * 3,
      humidity_ex: target.humidity + (row.humidity - target.humidity) * 3,
      soil_temp_ex: target.soilTemp + (row.soil_temp - target.soilTemp) * 3,
      soil_moisture_ex:
        target.soilMoisture + (row.soil_moisture - target.soilMoisture) * 3,
    }));
  }, [monitoringData]);

  const stats = useMemo(() => {
    if (!monitoringData?.history?.length) {
      return {
        avgVariance: 0,
        maxVariance: 0,
        overallInterpretation: "No Data",
      };
    }

    const allAverages = monitoringData.history.map((row) => {
      const values = [
        row.variance?.temp,
        row.variance?.humidity,
        row.variance?.soil_temp,
        row.variance?.soil_moisture,
      ].filter((v) => typeof v === "number");

      if (!values.length) return 0;
      return values.reduce((a, b) => a + b, 0) / values.length;
    });

    const avgVariance =
      allAverages.reduce((a, b) => a + b, 0) / allAverages.length;
    const maxVariance = Math.max(...allAverages);

    let overallInterpretation = "Poor";
    if (avgVariance <= 0.1) overallInterpretation = "Excellent";
    else if (avgVariance <= 0.2) overallInterpretation = "Very Good";
    else if (avgVariance <= 0.5) overallInterpretation = "Good";

    return {
      avgVariance,
      maxVariance,
      overallInterpretation,
    };
  }, [monitoringData]);

  return (
    <div style={page}>
      <div style={headerWrap}>
        <div>
          <h1 style={pageTitle}>Monitoring - Maintainability</h1>
          <p style={pageSubtitle}>
            Visual monitoring of batch history, target setpoints, and system
            stability.
          </p>
        </div>

        <div style={selectorWrap}>
          <label style={label}>Select Batch</label>
          <select
            value={selectedBatch}
            onChange={(e) => setSelectedBatch(e.target.value)}
            style={selectStyle}
          >
            {Array.isArray(batches) &&
              batches.map((batch) => (
                <option key={batch.batch_id} value={batch.batch_id}>
                  {batch.batch_id}
                </option>
              ))}
          </select>
        </div>
      </div>

      {loading && <div style={infoBox}>Loading monitoring data...</div>}
      {error && <div style={errorBox}>{error}</div>}

      {monitoringData && (
        <>
          <div style={summaryGrid}>
            <SummaryCard
              title="System Status"
              value={stats.overallInterpretation}
              color="#16a34a"
            />
            <SummaryCard
              title="Average Variance"
              value={stats.avgVariance.toFixed(3)}
              color="#2563eb"
            />
            <SummaryCard
              title="Highest Variance"
              value={stats.maxVariance.toFixed(3)}
              color="#7c3aed"
            />
            <SummaryCard
              title="Data Points"
              value={String(monitoringData.history?.length ?? 0)}
              color="#ea580c"
            />
          </div>

          <div style={topGrid}>
            <div style={card}>
              <h3 style={cardTitle}>Batch Information</h3>
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
            </div>

            {monitoringData.target && (
              <div style={card}>
                <h3 style={cardTitle}>Target Setpoints</h3>
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
              </div>
            )}
          </div>

          <ChartCard
            title="Ambient Temperature"
            subtitle="Exaggerated view to highlight very small deviations while maintaining the true target reference."
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11 }} />
                <YAxis
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
                  name="Actual (Exaggerated)"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="ambient_target"
                  name="Target"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Relative Humidity"
            subtitle="Small fluctuations are zoomed in to make maintainability easier to evaluate."
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11 }} />
                <YAxis
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
                  name="Actual (Exaggerated)"
                  stroke="#16a34a"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="humidity_target"
                  name="Target"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Soil Temperature"
            subtitle="Enhanced scaling makes very small control changes visually noticeable."
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11 }} />
                <YAxis
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
                  name="Actual (Exaggerated)"
                  stroke="#7c3aed"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="soil_temp_target"
                  name="Target"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Soil Moisture"
            subtitle="A tighter visual range helps show how consistently the system maintained the setpoint."
          >
            <ResponsiveContainer width="100%" height={320}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11 }} />
                <YAxis
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
                  name="Actual (Exaggerated)"
                  stroke="#ea580c"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="soil_moisture_target"
                  name="Target"
                  stroke="#dc2626"
                  strokeWidth={2}
                  strokeDasharray="6 6"
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Light Intensity"
            subtitle="Operational light pattern across the monitoring period."
          >
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="shortTime" tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="light"
                  name="Light"
                  stroke="#f59e0b"
                  strokeWidth={3}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </>
      )}
    </div>
  );
}

function InfoRow({ label, value }) {
  return (
    <div style={infoRow}>
      <span style={infoLabel}>{label}</span>
      <span style={infoValue}>{value}</span>
    </div>
  );
}

function SummaryCard({ title, value, color }) {
  return (
    <div style={summaryCard}>
      <div style={summaryTitle}>{title}</div>
      <div style={{ ...summaryValue, color }}>{value}</div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <div style={card}>
      <div style={{ marginBottom: 14 }}>
        <h3 style={cardTitle}>{title}</h3>
        <p style={cardSubtitle}>{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;

  return (
    <div style={tooltipStyle}>
      <div style={tooltipTitle}>{label}</div>
      {payload.map((entry, index) => (
        <div key={index} style={{ color: entry.color, marginTop: 6 }}>
          {entry.name}: <strong>{formatNumber(entry.value)}</strong>
        </div>
      ))}
    </div>
  );
}

function formatDisplayDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatNumber(value) {
  return typeof value === "number" ? value.toFixed(3) : value;
}

const page = {
  padding: "24px",
  background:
    "linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f8fafc 100%)",
  minHeight: "100vh",
};

const headerWrap = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-end",
  gap: "16px",
  marginBottom: "24px",
  flexWrap: "wrap",
};

const pageTitle = {
  margin: 0,
  fontSize: "30px",
  fontWeight: 700,
  color: "#0f172a",
};

const pageSubtitle = {
  marginTop: "8px",
  marginBottom: 0,
  color: "#475569",
  fontSize: "14px",
};

const selectorWrap = {
  minWidth: "220px",
};

const label = {
  display: "block",
  marginBottom: "8px",
  fontSize: "13px",
  fontWeight: 600,
  color: "#334155",
};

const selectStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #cbd5e1",
  background: "#fff",
  fontSize: "14px",
  outline: "none",
  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
};

const summaryGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: "16px",
  marginBottom: "20px",
};

const topGrid = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
  gap: "20px",
};

const summaryCard = {
  background: "rgba(255,255,255,0.95)",
  borderRadius: "16px",
  padding: "18px",
  boxShadow: "0 10px 25px rgba(15, 23, 42, 0.06)",
  border: "1px solid rgba(226, 232, 240, 0.9)",
};

const summaryTitle = {
  fontSize: "12px",
  fontWeight: 600,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

const summaryValue = {
  marginTop: "10px",
  fontSize: "24px",
  fontWeight: 800,
};

const card = {
  background: "rgba(255,255,255,0.96)",
  padding: "20px",
  borderRadius: "18px",
  boxShadow: "0 12px 30px rgba(15, 23, 42, 0.08)",
  marginBottom: "20px",
  border: "1px solid rgba(226, 232, 240, 0.9)",
};

const cardTitle = {
  margin: 0,
  fontSize: "18px",
  fontWeight: 700,
  color: "#0f172a",
};

const cardSubtitle = {
  margin: "6px 0 0 0",
  fontSize: "13px",
  color: "#64748b",
  lineHeight: 1.5,
};

const infoRow = {
  display: "flex",
  justifyContent: "space-between",
  gap: "12px",
  padding: "12px 0",
  borderBottom: "1px solid #e2e8f0",
};

const infoLabel = {
  color: "#475569",
  fontWeight: 600,
};

const infoValue = {
  color: "#0f172a",
  fontWeight: 700,
  textAlign: "right",
};

const tooltipStyle = {
  background: "#0f172a",
  border: "none",
  borderRadius: "12px",
  padding: "12px 14px",
  color: "#fff",
  boxShadow: "0 10px 20px rgba(0,0,0,0.18)",
};

const tooltipTitle = {
  fontWeight: 700,
  marginBottom: "4px",
};

const infoBox = {
  padding: "14px 16px",
  borderRadius: "12px",
  background: "#eff6ff",
  color: "#1d4ed8",
  marginBottom: "20px",
};

const errorBox = {
  padding: "14px 16px",
  borderRadius: "12px",
  background: "#fef2f2",
  color: "#dc2626",
  marginBottom: "20px",
};