import { api } from "./api";

export async function getShippingStates() {
  const response = await api.get("/api/shipping/locations/states");
  return response.data?.data?.states || [];
}

export async function getShippingDistricts(state) {
  if (!state) return [];
  const response = await api.get("/api/shipping/locations/districts", { params: { state } });
  return response.data?.data?.districts || [];
}
