import { api } from "./api";

const BASE = "/api/vendor/returns";

export const vendorReturnService = {
  list: (params = {}) => api.get(BASE, { params }).then((r) => r.data),
  getById: (id) => api.get(`${BASE}/${id}`).then((r) => r.data),
  markReceived: (id) => api.post(`${BASE}/${id}/received`).then((r) => r.data),
  accept: (id, notes = "") => api.post(`${BASE}/${id}/accept`, { notes }).then((r) => r.data),
  createPickup: (id) => api.post(`${BASE}/${id}/create-pickup`).then((r) => r.data),
  dispute: (id, formData) =>
    api.post(`${BASE}/${id}/dispute`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
};

export default vendorReturnService;
