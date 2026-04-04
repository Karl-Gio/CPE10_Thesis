const LARAVEL_API = "http://localhost:8000/api";
const PYTHON_API = "http://localhost:5000";

const getToken = () => localStorage.getItem("token");

const getAuthHeaders = () => {
  const token = getToken();

  return {
    Accept: "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

// Fetch active configuration
export const fetchActiveConfig = async () => {
  try {
    const token = getToken();
    if (!token) return 0;

    const res = await fetch(`${LARAVEL_API}/configurations/active`, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch active configuration");
    }

    const data = await res.json();

    return Number(data?.uv_duration ?? 0);
  } catch (err) {
    console.error("Config Fetch Error:", err);
    return 0;
  }
};

// Fetch latest sensor stats
// Keep this on Python/Flask only if that service is still your real-time source.
export const fetchLatestStats = async () => {
  try {
    const res = await fetch(`${PYTHON_API}/status`, {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) {
      throw new Error("Failed to fetch latest dashboard data");
    }

    return await res.json();
  } catch (err) {
    console.error("Latest Data Fetch Error:", err.message);
    return null;
  }
};

// Fetch environmental trends from Laravel
export const fetchEnvironmentalTrends = async (batchId = null, limit = 20) => {
  try {
    const token = getToken();
    if (!token) {
      throw new Error("No auth token found");
    }

    const params = new URLSearchParams();

    if (batchId) {
      params.append("batch_id", batchId);
    }

    if (limit) {
      params.append("limit", String(limit));
    }

    const queryString = params.toString();
    const url = queryString
      ? `${LARAVEL_API}/dashboard/trends?${queryString}`
      : `${LARAVEL_API}/dashboard/trends`;

    const res = await fetch(url, {
      headers: getAuthHeaders(),
    });

    if (!res.ok) {
      throw new Error("Failed to fetch trends");
    }

    const data = await res.json();

    return {
      labels: Array.isArray(data.labels) ? data.labels : [],
      temp: Array.isArray(data.temp) ? data.temp : [],
      humidity: Array.isArray(data.humidity) ? data.humidity : [],
      soilMoisture: Array.isArray(data.soilMoisture) ? data.soilMoisture : [],
      soilTemp: Array.isArray(data.soilTemp) ? data.soilTemp : [],
      light: Array.isArray(data.light) ? data.light : [],
      pechayCount: Array.isArray(data.pechayCount) ? data.pechayCount : [],
      batch: data.batch ?? null,
    };
  } catch (err) {
    console.error("Trend Fetch Error:", err);
    throw new Error("Could not load environmental trends.");
  }
};