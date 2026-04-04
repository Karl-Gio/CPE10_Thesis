import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

export async function fetchBatches() {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.get(`${API_BASE_URL}/batches`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return Array.isArray(res.data) ? res.data : [];
  } catch (err) {
    console.error("Fetch Batches Error:", err);
    return [];
  }
}

export async function fetchBatchDetails(batchId) {
  try {
    const token = localStorage.getItem("token");

    const res = await axios.get(`${API_BASE_URL}/batches/${batchId}`, {
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    return res.data;
  } catch (err) {
    console.error("Fetch Batch Details Error:", err);
    throw err;
  }
}