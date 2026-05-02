import { api } from "./api";
import { adminHttp } from "./adminHttp";
import { staffHttp } from "./staffHttp";

const CLIENTS = {
  admin: adminHttp,
  vendor: api,
  staff: staffHttp,
};

function getClient(role) {
  return CLIENTS[role] || api;
}

export async function getNotificationSummary(role) {
  const { data } = await getClient(role).get("/api/notifications/summary");
  return data;
}

export async function getNotifications(role, params = {}) {
  const { data } = await getClient(role).get("/api/notifications", { params });
  return data;
}

export async function markNotificationsRead(role, payload = {}) {
  const { data } = await getClient(role).post("/api/notifications/read", payload);
  return data;
}
