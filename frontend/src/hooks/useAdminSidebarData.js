import { useEffect, useMemo, useState } from "react";
import { ADMIN_PRIMARY_ITEM, ADMIN_SECTION_ITEMS } from "../config/sidebarModules";
import { useAdminSession } from "./useAdminSession";
import vendorModuleService from "../services/vendorModule.service";

export function useAdminSidebarData() {
  const { isLegacyAdmin, canAccess } = useAdminSession();
  const [enabledModules, setEnabledModules] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadModuleFlags() {
      if (!isLegacyAdmin) {
        setEnabledModules({});
        return;
      }

      try {
        setLoading(true);
        const modules = await vendorModuleService.getAllModules();
        if (!active) return;
        setEnabledModules(
          Object.fromEntries(modules.map((module) => [module.key, module.enabled === true]))
        );
      } catch (error) {
        if (!active) return;
        setEnabledModules({});
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadModuleFlags();
    return () => {
      active = false;
    };
  }, [isLegacyAdmin]);

  const sections = useMemo(() => {
    return ADMIN_SECTION_ITEMS.map((section) => ({
      ...section,
      items: section.items.filter((item) => {
        if (item.legacyOnly && !isLegacyAdmin) {
          return false;
        }

        if (item.permission && !canAccess(item.permission)) {
          return false;
        }

        if (item.moduleKey && enabledModules[item.moduleKey] === false) {
          return false;
        }

        return true;
      }),
    })).filter((section) => section.items.length > 0);
  }, [canAccess, enabledModules, isLegacyAdmin]);

  return {
    title: "Admin Hub",
    subtitle: "Accordion navigation",
    primaryItem: ADMIN_PRIMARY_ITEM,
    sections,
    loading,
    error: "",
  };
}
