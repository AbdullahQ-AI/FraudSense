import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  headers: {
    "X-API-Key": import.meta.env.VITE_API_KEY,
  },
});

export const predictTransaction = (payload) => api.post("/predict", payload);
export const getDriftStatus = () => api.get("/drift-status");
export const getHealth = () => api.get("/health");
export const getModelInfo = () => api.get("/model-info");
export const getTransactions = (limit = 50) => api.get(`/transactions?limit=${limit}`);
export const getStats = () => api.get("/stats");

export default api;