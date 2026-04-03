// dashboardHelpers.js

// Fetch active configuration (UV duration)
export const fetchActiveConfig = async () => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return 0;

    const res = await fetch("http://localhost:8000/api/configurations/active", {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error("Failed to fetch active configuration");

    const data = await res.json();
    return data?.uvDuration || 0;
  } catch (err) {
    console.error("Config Fetch Error:", err);
    return 0;
  }
};

// Fetch latest sensor stats
export const fetchLatestStats = async () => {
  try {
    const res = await fetch("http://localhost:5000/status");

    if (!res.ok) throw new Error("Failed to fetch latest dashboard data");

    return await res.json();
  } catch (err) {
    console.error("Latest Data Fetch Error:", err.message);
    return null;
  }
};

// Fetch environmental trends
export const fetchEnvironmentalTrends = async () => {
  try {
    const res = await fetch("http://localhost:8000/api/dashboard/trends", {
      headers: {
        Accept: "application/json",
      },
    });

    if (!res.ok) throw new Error("Failed to fetch trends");

    const data = await res.json();

    return {
      labels: Array.isArray(data.labels) ? data.labels : [],
      temp: Array.isArray(data.temp) ? data.temp : [],
      humidity: Array.isArray(data.humidity) ? data.humidity : [],
      soilMoisture: Array.isArray(data.soilMoisture) ? data.soilMoisture : [],
      soilTemp: Array.isArray(data.soilTemp) ? data.soilTemp : [],
      light: Array.isArray(data.light) ? data.light : [],
      pechayCount: Array.isArray(data.pechayCount) ? data.pechayCount : [],
    };
  } catch (err) {
    console.error("Trend Fetch Error:", err);
    throw new Error("Could not load environmental trends.");
  }
};