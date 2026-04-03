export const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export function round3(value) {
  return typeof value === "number" && Number.isFinite(value)
    ? Number(value.toFixed(3))
    : value;
}

export function formatDisplayDate(dateStr) {
  return new Date(dateStr).toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatNumber(value) {
  return typeof value === "number" ? value.toFixed(3) : value;
}

export function buildChartData(monitoringData) {
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

    ambient_temp: round3(row.ambient_temp),
    ambient_target: round3(target.ambientTemp),

    humidity: round3(row.humidity),
    humidity_target: round3(target.humidity),

    soil_temp: round3(row.soil_temp),
    soil_temp_target: round3(target.soilTemp),

    soil_moisture: round3(row.soil_moisture),
    soil_moisture_target: round3(target.soilMoisture),

    light: round3(row.light),
    pechay_count: round3(row.pechay_count),

    ambient_temp_ex: round3(
      target.ambientTemp + (row.ambient_temp - target.ambientTemp) * 3
    ),
    humidity_ex: round3(
      target.humidity + (row.humidity - target.humidity) * 3
    ),
    soil_temp_ex: round3(
      target.soilTemp + (row.soil_temp - target.soilTemp) * 3
    ),
    soil_moisture_ex: round3(
      target.soilMoisture + (row.soil_moisture - target.soilMoisture) * 3
    ),
  }));
}

export function buildStats(monitoringData) {
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

  const avgVariance = round3(
    allAverages.reduce((a, b) => a + b, 0) / allAverages.length
  );
  const maxVariance = round3(Math.max(...allAverages));

  return {
    avgVariance,
    maxVariance,
    overallInterpretation:
      monitoringData?.overall_interpretation || "Unknown",
  };
}