import axios from "axios";

const BASE = "/api/admin/returns";

export const adminReturnService = {
  getStats: () => axios.get(`${BASE}/stats`).then((r) => r.data),
  list: (params = {}) => axios.get(BASE, { params }).then((r) => r.data),
  getDisputes: (params = {}) => axios.get(`${BASE}/disputes`, { params }).then((r) => r.data),
  getById: (id) => axios.get(`${BASE}/${id}`).then((r) => r.data),
  approve: (id, note = "") => axios.post(`${BASE}/${id}/approve`, { note }).then((r) => r.data),
  reject: (id, reason) => axios.post(`${BASE}/${id}/reject`, { reason }).then((r) => r.data),
  resolveDispute: (id, decision, reason) =>
    axios.post(`${BASE}/${id}/resolve-dispute`, { decision, reason }).then((r) => r.data),
};

export default adminReturnService;
