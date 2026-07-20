import { create } from "zustand";
import * as vendorDashboardService from "../services/vendorDashboardService";

export const useVendorDashboardStore = create((set) => ({
  sidebarOpen: true,
  dashboard: null,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  fetchDashboard: async (params = {}) => {
    const response = await vendorDashboardService.getVendorDashboard(params);
    set({ dashboard: response.data });
    return response.data;
  },
}));
