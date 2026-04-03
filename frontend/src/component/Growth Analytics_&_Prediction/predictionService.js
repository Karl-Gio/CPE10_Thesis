import axios from "axios";

const API_BASE_URL = "http://localhost:8000/api";

export async function fetchBatches() {
  const res = await axios.get(`${API_BASE_URL}/batches`);
  return Array.isArray(res.data) ? res.data : [];
}

export async function fetchBatchDetails(batchId) {
  const res = await axios.get(`${API_BASE_URL}/batches/${batchId}`);
  return res.data;
}