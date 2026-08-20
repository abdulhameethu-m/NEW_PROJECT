import axios from "axios";

const BASE = "/api/vendor/returns";

export const vendorReturnService = {
  list: (params = {}) => axios.get(BASE, { params }).then((r) => r.data),
  getById: (id) => axios.get(`${BASE}/${id}`).then((r) => r.data),
  markReceived: (id) => axios.post(`${BASE}/${id}/received`).then((r) => r.data),
  accept: (id, notes = "") => axios.post(`${BASE}/${id}/accept`, { notes }).then((r) => r.data),
  dispute: (id, formData) =>
    axios.post(`${BASE}/${id}/dispute`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
};

export default vendorReturnService;
