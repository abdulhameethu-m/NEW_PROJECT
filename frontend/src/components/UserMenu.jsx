import { useRef, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../context/authStore";
import * as authService from "../services/authService";

/**
 * UserMenu Component
 * 
 * A production-ready user profile dropdown menu component
 * Displays user avatar/details in top-right corner with dropdown menu
 * 
 * Features:
 * - User avatar with name and role
 * - Click to toggle dropdown menu
 * - Navigation links to profile, orders, wishlist, settings
 * - Logout functionality
 * - Click-outside to close
 * - Mobile responsive
 * - Smooth animations
 */
export function UserMenu() {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  // Close menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
        triggerRef.current &&
        !triggerRef.current.contains(event.target)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    function handleEscape(event) {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleEscape);
      return () => document.removeEventListener("keydown", handleEscape);
    }
  }, [isOpen]);

  const handleLogout = async () => {
    const { token, refreshToken: rt } = useAuthStore.getState();
    
    // Always try server logout first (even without token it should work now)
    try {
      // Send both access token (via Authorization header) and refresh token (in body)
      await authService.logout(rt || "");
    } catch (error) {
      // Server logout might fail with 401 if no valid token, but that's OK
      // Client-side logout will happen anyway
      console.debug("Server logout response:", error?.response?.status);
    } finally {
      // Always do client-side logout regardless of server response
      logout();
      setIsOpen(false);
      navigate("/login", { replace: true });
    }
  };

  const handleMenuClick = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  if (!user) return null;

  // Get user's initials for avatar
  const initials = user.name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase() || "U";

  // Determine avatar color based on role
  const roleColors = {
    admin: "bg-purple-500",
    vendor: "bg-blue-500",
    user: "bg-slate-500",
  };
  const avatarBg = roleColors[user.role] || "bg-slate-500";

  const menuItems = [
    { label: "My Profile", path: "/profile", icon: "👤" },
    { label: "My Orders", path: "/orders", icon: "📦" },
    { label: "Wishlist", path: "/wishlist", icon: "❤️" },
    { label: "Addresses", path: "/addresses", icon: "📍" },
    { label: "Settings", path: "/settings", icon: "⚙️" },
  ];

  return (
    <div className="relative">
      {/* Avatar Button - Top Right Trigger */}
      <button
        ref={triggerRef}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 transition-all sm:px-3 ${
          isOpen
            ? "border-blue-300 bg-blue-50 shadow-md"
            : "border-slate-200 bg-white hover:bg-slate-50"
        }`}
        aria-label="Open user menu"
        aria-expanded={isOpen}
      >
        {/* Avatar Circle */}
        <div
          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarBg}`}
          title={user.name}
        >
          {initials}
        </div>

        {/* User Name (Hidden on mobile) */}
        <span className="hidden max-w-[8rem] truncate text-sm font-medium text-slate-700 sm:inline">
          {user.name}
        </span>

        {/* Chevron Icon */}
        <svg
          className={`h-4 w-4 text-slate-500 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 14l-7 7m0 0l-7-7m7 7V3"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          ref={menuRef}
          className="absolute right-0 top-full z-50 mt-2 w-56 origin-top-right rounded-lg border border-slate-200 bg-white shadow-lg ring-1 ring-black/5 animate-in fade-in slide-in-from-top-2 duration-200"
        >
          {/* User Info Header */}
          <div className="border-b border-slate-100 px-4 py-3">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white ${avatarBg}`}
              >
                {initials}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-slate-900">
                  {user.name}
                </div>
                <div className="truncate text-xs text-slate-500">
                  {user.email}
                </div>
                <div className="mt-1 inline-block rounded bg-slate-100 px-2 py-0.5 text-xs font-medium capitalize text-slate-700">
                  {user.role}
                </div>
              </div>
            </div>
          </div>

          {/* Menu Items */}
          <nav className="space-y-0 py-2">
            {menuItems.map((item) => (
              <button
                key={item.path}
                onClick={() => handleMenuClick(item.path)}
                className="flex w-full items-center gap-3 px-4 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50 hover:text-slate-900"
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="border-t border-slate-100" />

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-600 transition-colors hover:bg-red-50 hover:text-red-700"
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
