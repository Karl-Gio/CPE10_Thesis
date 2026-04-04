import axios from "axios";

const API = "http://localhost:8000/api";

export const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

export function round3(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(3))
    : value;
}

export function formatDisplayDate(dateStr) {
  if (!dateStr) return "-";

  return new Date(dateStr).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatNumber(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? value.toFixed(3)
    : value;
}

export function normalizeMonitoringData(monitoringData) {
  if (!monitoringData) return null;

  return {
    batch: monitoringData.batch ?? monitoringData.batch_id ?? "",
    batchId: monitoringData.batchId ?? monitoringData.batch_id ?? "",
    datePlanted:
      monitoringData.datePlanted ?? monitoringData.date_planted ?? null,
    germinationDate:
      monitoringData.germinationDate ??
      monitoringData.germination_date ??
      null,
    overallPValue:
      monitoringData.overallPValue ?? monitoringData.overall_p_value ?? null,
    overallInterpretation:
      monitoringData.overallInterpretation ??
      monitoringData.overall_interpretation ??
      "Unknown",

    target: monitoringData.target
      ? {
          ambientTemp:
            monitoringData.target.ambientTemp ??
            monitoringData.target.ambient_temp ??
            null,
          ambientHum:
            monitoringData.target.ambientHum ??
            monitoringData.target.humidity ??
            null,
          soilTemp:
            monitoringData.target.soilTemp ??
            monitoringData.target.soil_temp ??
            null,
          soilMoisture:
            monitoringData.target.soilMoisture ??
            monitoringData.target.soil_moisture ??
            null,
        }
      : null,

    ttest: monitoringData.ttest
      ? {
          ambientTemp:
            monitoringData.ttest.ambientTemp ??
            monitoringData.ttest.ambient_temp ??
            null,
          ambientHum:
            monitoringData.ttest.ambientHum ??
            monitoringData.ttest.humidity ??
            null,
          soilTemp:
            monitoringData.ttest.soilTemp ??
            monitoringData.ttest.soil_temp ??
            null,
          soilMoisture:
            monitoringData.ttest.soilMoisture ??
            monitoringData.ttest.soil_moisture ??
            null,
        }
      : null,

    history: Array.isArray(monitoringData.history)
      ? monitoringData.history.map((row) => ({
          timestamp: row.timestamp ?? null,
          ambientTemp: row.ambientTemp ?? row.ambient_temp ?? null,
          ambientHum: row.ambientHum ?? row.humidity ?? null,
          soilTemp: row.soilTemp ?? row.soil_temp ?? null,
          soilMoisture: row.soilMoisture ?? row.soil_moisture ?? null,
          light: row.light ?? row.light_intensity ?? null,
          pechayCount: row.pechayCount ?? row.pechay_count ?? null,
          variance: row.variance
            ? {
                temp: row.variance.temp ?? null,
                humidity: row.variance.humidity ?? null,
                soilTemp:
                  row.variance.soilTemp ?? row.variance.soil_temp ?? null,
                soilMoisture:
                  row.variance.soilMoisture ??
                  row.variance.soil_moisture ??
                  null,
              }
            : null,
        }))
      : [],
  };
}

export async function fetchBatches() {
  const res = await axios.get(`${API}/batches`, getAuthConfig());
  const data = Array.isArray(res.data) ? res.data : res.data?.data ?? [];

  return data.map((batch) => ({
    ...batch,
    batchId: batch.batchId ?? batch.batch_id ?? "",
    datePlanted: batch.datePlanted ?? batch.date_planted ?? null,
    actualGerminationDate:
      batch.actualGerminationDate ?? batch.actual_germination_date ?? null,
  }));
}

export async function fetchMonitoringData(batchId) {
  const res = await axios.get(`${API}/monitoring/${batchId}`, getAuthConfig());
  return normalizeMonitoringData(res.data);
}

export function buildChartData(rawMonitoringData) {
  const monitoringData = normalizeMonitoringData(rawMonitoringData);

  if (!monitoringData?.history?.length || !monitoringData?.target) return [];

  const target = monitoringData.target;

  return monitoringData.history.map((row, index) => ({
    index: index + 1,
    shortTime: row.timestamp
      ? new Date(row.timestamp).toLocaleString("en-PH", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })
      : "-",
    fullTime: row.timestamp
      ? new Date(row.timestamp).toLocaleString("en-PH")
      : "-",

    ambientTemp: round3(row.ambientTemp),
    ambientTempTarget: round3(target.ambientTemp),

    ambientHum: round3(row.ambientHum),
    ambientHumTarget: round3(target.ambientHum),

    soilTemp: round3(row.soilTemp),
    soilTempTarget: round3(target.soilTemp),

    soilMoisture: round3(row.soilMoisture),
    soilMoistureTarget: round3(target.soilMoisture),

    light: round3(row.light),
    pechayCount: round3(row.pechayCount),
  }));
}

export function getMetricDomain(data, actualKey, targetKey, padding = 0.4) {
  if (!Array.isArray(data) || !data.length) return ["auto", "auto"];

  const values = data
    .flatMap((row) => [row?.[actualKey], row?.[targetKey]])
    .filter((value) => typeof value === "number" && Number.isFinite(value));

  if (!values.length) return ["auto", "auto"];

  const min = Math.min(...values);
  const max = Math.max(...values);

  const rawRange = max - min;
  const safeRange = rawRange === 0 ? 1 : rawRange;

  const dynamicPadding = Math.max(safeRange * 0.25, padding);

  return [round3(min - dynamicPadding), round3(max + dynamicPadding)];
}

export function buildStats(rawMonitoringData) {
  const monitoringData = normalizeMonitoringData(rawMonitoringData);

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
      row.variance?.soilTemp,
      row.variance?.soilMoisture,
    ].filter((v) => typeof v === "number" && Number.isFinite(v));

    if (!values.length) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  });

  const avgVariance = round3(
    allAverages.reduce((a, b) => a + b, 0) / allAverages.length
  );
  const maxVariance = round3(Math.max(...allAverages));

  return {
    avgVariance,
    maxVariance,
    overallInterpretation:
      monitoringData.overallInterpretation || "Unknown",
  };
}