import axios from "axios";

const api = axios.create({
  baseURL: "http://127.0.0.1:8000",
  timeout: 8000,
});

export async function fetchStrategyDashboard(strategyId = "demo-strategy") {
  const { data } = await api.get(`/api/v1/strategies/${strategyId}/dashboard`);
  return data;
}
