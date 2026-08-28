import { useMemo } from "react";
import { Sidebar } from "../sidebar/Sidebar";
import { ADMIN_SECTION_ITEMS, ADMIN_PRIMARY_ITEM } from "../../config/sidebarModules";

function hasPermission(permissions, permission) {
  if (!permission) return true;
  const [moduleName, action] = permission.split(".");
  return permissions?.[moduleName]?.[action] === true;
}

export function StaffSidebar({ permissions, enabledModules = {}, isOpen, onToggle, onClose }) {
  const primaryItem = {
    ...ADMIN_PRIMARY_ITEM,
    path: "/staff/dashboard",
  };

  const sections = useMemo(() => {
    function filterItem(item) {
      if (item.children?.length) {
        const children = item.children.map(filterItem).filter(Boolean);
        if (!children.length) return null;
        return {
          ...item,
          path: item.path ? item.path.replace("/admin/", "/staff/") : undefined,
          children,
        };
      }
      
      // Filter leaf nodes
      if (item.permission && !hasPermission(permissions, item.permission)) return null;
      if (item.moduleKey && enabledModules[item.moduleKey] === false) return null;
      if (item.legacyOnly) return null; // Hide legacy admin modules from staff
      
      return {
        ...item,
        path: item.path ? item.path.replace("/admin/", "/staff/") : undefined,
      };
    }

    return ADMIN_SECTION_ITEMS.map((section) => ({
      ...section,
      items: section.items.map(filterItem).filter(Boolean),
    })).filter((section) => section.items.length > 0);
  }, [permissions, enabledModules]);

  return (
      <Sidebar
        open={isOpen}
        onClose={onClose}
        onNavigate={() => {
          if (window.innerWidth < 1024 && onClose) onClose();
        }}
        title="GRM Staff"
        subtitle="Dynamic role workspace"
        primaryItem={primaryItem}
        sections={sections}
        loading={false}
        error=""
      />
  );
}
