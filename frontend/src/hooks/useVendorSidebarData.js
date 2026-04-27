import { useMemo } from "react";
import {
  VENDOR_DYNAMIC_MODULE_META,
  VENDOR_PRIMARY_ITEM,
  VENDOR_STATIC_ITEMS,
} from "../config/sidebarModules";
import { useModuleAccess } from "../context/VendorModuleContext";

function normalizeSectionKey(section) {
  return String(section || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-");
}

export function useVendorSidebarData({ unreadCount = 0 } = {}) {
  const { modules, loading, error } = useModuleAccess();

  const dynamicSections = useMemo(() => {
    const grouped = new Map();
    const hasPaymentsModule = modules.some((module) => module.key === "payments" && module.enabled && module.vendorEnabled);

    [...modules]
      .sort((left, right) => (left.order || 0) - (right.order || 0))
      .forEach((module) => {
        const meta = VENDOR_DYNAMIC_MODULE_META[module.key];
        if (!meta) {
          return;
        }

        const sectionName = meta.section;
        if (!grouped.has(sectionName)) {
          grouped.set(sectionName, []);
        }

        grouped.get(sectionName).push({
          name: module.name,
          path: meta.path,
          icon: meta.icon,
          title: module.description,
          moduleKey: module.key,
        });
      });

    if (hasPaymentsModule) {
      const financeItems = grouped.get("Finance") || [];
      const existingPaths = new Set(financeItems.map((item) => item.path));

      [
        { name: "Payout History", path: "/vendor/finance/payouts" },
        { name: "Ledger", path: "/vendor/finance/ledger" },
        { name: "Payout Account", path: "/vendor/finance/account" },
      ].forEach((item) => {
        if (!existingPaths.has(item.path)) {
          financeItems.push(item);
        }
      });

      grouped.set("Finance", financeItems);
    }

    return Array.from(grouped.entries()).map(([section, items]) => ({
      section,
      key: normalizeSectionKey(section),
      items,
    }));
  }, [modules]);

  const staticSections = useMemo(() => {
    return VENDOR_STATIC_ITEMS.map((section) => ({
      ...section,
      items: section.items.map((item) => ({
        ...item,
        badgeCount: item.badgeKey === "notificationsUnread" ? unreadCount : undefined,
      })),
    }));
  }, [unreadCount]);

  return {
    title: "Vendor Central",
    subtitle: "Seller workspace",
    primaryItem: VENDOR_PRIMARY_ITEM,
    sections: [...dynamicSections, ...staticSections].filter((section) => section.items.length > 0),
    loading,
    error,
  };
}
