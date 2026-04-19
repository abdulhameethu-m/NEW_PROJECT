import { create } from "zustand";
import * as vendorDashboardService from "../services/vendorDashboardService";

export const useVendorDashboardStore = create((set) => ({
  sidebarOpen: false,
  dashboard: null,
  notificationsUnread: 0,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
  fetchDashboard: async () => {
    const response = await vendorDashboardService.getVendorDashboard();
    set({ dashboard: response.data });
    return response.data;
  },
  fetchNotificationsUnread: async () => {
    const response = await vendorDashboardService.getVendorNotifications({ limit: 1 });
    set({ notificationsUnread: response.data.unreadCount || 0 });
    return response.data.unreadCount || 0;
  },
}));
