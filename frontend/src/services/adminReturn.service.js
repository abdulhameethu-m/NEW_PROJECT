import { adminHttp } from "./adminHttp";

const BASE = "/api/admin/returns";

export const adminReturnService = {
  getStats: () => adminHttp.get(`${BASE}/stats`).then((r) => r.data),
  list: (params = {}) => adminHttp.get(BASE, { params }).then((r) => r.data),
  getDisputes: (params = {}) => adminHttp.get(`${BASE}/disputes`, { params }).then((r) => r.data),
  getById: (id) => adminHttp.get(`${BASE}/${id}`).then((r) => r.data),
  approve: (id, note = "") => adminHttp.post(`${BASE}/${id}/approve`, { note }).then((r) => r.data),
  reject: (id, reason) => adminHttp.post(`${BASE}/${id}/reject`, { reason }).then((r) => r.data),
  resolveDispute: (id, decision, reason) =>
    adminHttp.post(`${BASE}/${id}/resolve-dispute`, { decision, reason }).then((r) => r.data),
};

export default adminReturnService;
