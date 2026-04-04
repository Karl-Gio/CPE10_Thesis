import axios from "axios";

const API_8000 = "http://localhost:8000/api";
const API_5000 = "http://localhost:5000/api";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");

  return {
    headers: {
      Accept: "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  };
};

// =======================
// RESPONSE MAPPER
// =======================
const mapConfiguration = (data) => {
  if (!data) return null;

  return {
    batch: data.batch ?? data.batch_id ?? "",
    ambientTemp: data.ambientTemp ?? data.ambient_temp ?? "",
    ambientHum: data.ambientHum ?? data.humidity ?? "",
    soilMoisture: data.soilMoisture ?? data.soil_moisture ?? "",
    soilTemp: data.soilTemp ?? data.soil_temp ?? "",
    uvStart: data.uvStart ?? data.uv_start ?? "",
    uvDuration: data.uvDuration ?? data.uv_duration ?? "",
    ledStart: data.ledStart ?? data.led_start ?? "",
    ledDuration: data.ledDuration ?? data.led_duration ?? "",
    isActive: data.isActive ?? data.is_active ?? 0,
    createdAt: data.createdAt ?? data.created_at ?? null,
    updatedAt: data.updatedAt ?? data.updated_at ?? null,
  };
};

// =======================
// LARAVEL (AUTH REQUIRED)
// =======================

export const getBatches = async () => {
  try {
    const res = await axios.get(`${API_8000}/batches`, getAuthConfig());
    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("getBatches error:", err);
    return [];
  }
};

export const getActiveConfiguration = async () => {
  try {
    const res = await axios.get(
      `${API_8000}/configurations/active`,
      getAuthConfig()
    );
    return mapConfiguration(res.data);
  } catch (err) {
    console.error("getActiveConfiguration error:", err);
    return null;
  }
};

export const getBatchConfiguration = async (batchId) => {
  try {
    const res = await axios.get(
      `${API_8000}/configurations/batch/${encodeURIComponent(batchId)}`,
      getAuthConfig()
    );
    return mapConfiguration(res.data);
  } catch (err) {
    if (err.response?.status === 404) {
      return null;
    }
    console.error("getBatchConfiguration error:", err);
    throw err;
  }
};

export const createBatch = async (payload) => {
  try {
    const res = await axios.post(
      `${API_8000}/batches`,
      payload,
      getAuthConfig()
    );
    return res.data;
  } catch (err) {
    console.error("createBatch error:", err);
    throw err;
  }
};

export const saveConfiguration = async (payload) => {
  const token = localStorage.getItem("token");

  const formattedPayload = {
    batch_id: payload.batchId,
    ambient_temp: Number(payload.ambientTemp),
    humidity: Number(payload.ambientHum),
    soil_moisture: Number(payload.soilMoisture),
    soil_temp: Number(payload.soilTemp),
    uv_start: payload.uvStart,
    uv_duration: Number(payload.uvDuration),
    led_start: payload.ledStart,
    led_duration: Number(payload.ledDuration),
  };

  console.log("saveConfiguration payload:", formattedPayload);

  const res = await axios.post(
    `${API_8000}/configurations`,
    formattedPayload,
    {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    }
  );

  return res.data;
};

// =======================
// PYTHON (NO AUTH)
// =======================

export const predictBatch = async (payload) => {
  try {
    const res = await axios.post(`${API_5000}/predict`, payload, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  } catch (err) {
    console.error("predictBatch error:", err);
    throw err;
  }
};

export const syncParameters = async (payload) => {
  try {
    const res = await axios.post(`${API_5000}/update_params`, payload, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  } catch (err) {
    console.error("syncParameters error:", err);
    throw err;
  }
};

export const sequentialShutdown = async () => {
  try {
    const res = await axios.post(`${API_5000}/sequential_shutdown`, {}, {
      headers: { Accept: "application/json" },
    });
    return res.data;
  } catch (err) {
    console.error("sequentialShutdown error:", err);
    throw err;
  }
};