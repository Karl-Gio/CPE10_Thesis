import axios from "axios";

const API_8000 = "http://localhost:8000/api";
const API_5000 = "http://localhost:5000/api";

const getAuthConfig = () => {
  const token = localStorage.getItem("token");
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const getBatches = async () => {
  const res = await axios.get(`${API_8000}/batches`, getAuthConfig());
  return Array.isArray(res.data) ? res.data : [];
};

export const getActiveConfiguration = async () => {
  const res = await axios.get(
    `${API_8000}/configurations/active`,
    getAuthConfig()
  );
  return res.data;
};

export const getBatchConfiguration = async (batchId) => {
  const res = await axios.get(
    `${API_8000}/configurations/batch/${encodeURIComponent(batchId)}`,
    getAuthConfig()
  );
  return res.data;
};

export const createBatch = async (payload) => {
  const res = await axios.post(
    `${API_8000}/batches`,
    payload,
    getAuthConfig()
  );
  return res.data;
};

export const saveConfiguration = async (payload) => {
  const res = await axios.post(
    `${API_8000}/configurations`,
    payload,
    getAuthConfig()
  );
  return res.data;
};

export const predictBatch = async (payload) => {
  const res = await axios.post(`${API_5000}/predict`, payload);
  return res.data;
};

export const syncParameters = async (payload) => {
  const res = await axios.post(`${API_5000}/update_params`, payload);
  return res.data;
};

export const sequentialShutdown = async () => {
  const res = await axios.post(`${API_5000}/sequential_shutdown`);
  return res.data;
};