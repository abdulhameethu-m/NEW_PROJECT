import { useEffect, useState, useMemo, useRef } from "react";
import { useThemeStore } from "../hooks/useThemeStore";
import { confirmAction, showSuccess } from "../services/notificationService";
import { Play, Save, Check, RotateCcw, Copy, Trash2, Plus, Monitor, Tablet, Smartphone } from "lucide-react";

export function AdminDynamicThemePage() {
  const {
    themes,
    activeTheme,
    selectedTheme,
    draftTheme,
    loading,
    saving,
    activating,
    loadThemes,
    selectTheme,
    createTheme,
    saveDraft,
    activateTheme,
    duplicateTheme,
    deleteTheme,
    resetDraft,
    updateDraftSection,
  } = useThemeStore();

  const [previewMode, setPreviewMode] = useState("desktop"); // desktop, tablet, mobile
  const [activeTab, setActiveTab] = useState("global");

  useEffect(() => {
    loadThemes();
  }, [loadThemes]);

  const handleCreateNew = async () => {
    const name = prompt("Enter a name for the new theme:");
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now();
    await createTheme({ name, slug });
  };

  const handleDuplicate = async () => {
    if (!selectedTheme) return;
    await duplicateTheme(selectedTheme._id);
  };

  const handleDelete = async () => {
    if (!selectedTheme) return;
    if (selectedTheme.isActive) {
      alert("Cannot delete the active theme.");
      return;
    }
    const confirm = await confirmAction({ message: `Delete theme '${selectedTheme.name}'?`, tone: "danger", confirmLabel: "Delete" });
    if (confirm) {
      await deleteTheme(selectedTheme._id);
    }
  };

  const handleActivate = async () => {
    if (!selectedTheme) return;
    const confirm = await confirmAction({ message: "Activate this theme? Your current active storefront theme will be replaced.", confirmLabel: "Activate" });
    if (confirm) {
      await activateTheme(selectedTheme._id);
    }
  };

  const handleReset = async () => {
    const confirm = await confirmAction({ message: "Reset draft to last saved state? All unsaved changes will be lost.", tone: "danger", confirmLabel: "Reset" });
    if (confirm) {
      resetDraft();
    }
  };

  const renderColorInput = (section, key, label, description) => {
    const val = draftTheme?.[section]?.[key] || "#000000";
    
    // HTML native color picker only supports standard 7-character hex colors
    const isStandardHex = /^#[0-9A-Fa-f]{6}$/.test(val);

    return (
      <div key={key} className="mb-4">
        <label className="block text-sm font-semibold text-slate-800 dark:text-slate-200">{label}</label>
        {description && <p className="text-xs text-slate-500 mb-2">{description}</p>}
        <div className="flex items-center gap-3 mt-1">
          {isStandardHex ? (
            <input
              type="color"
              value={val}
              onChange={(e) => updateDraftSection(section, { [key]: e.target.value })}
              className="h-10 w-14 shrink-0 cursor-pointer rounded border border-slate-300 bg-white p-1"
              title="Pick a color"
            />
          ) : (
            <div 
              className="h-10 w-14 shrink-0 rounded border border-slate-300 shadow-inner"
              style={{ background: val }}
              title="Preview of gradient or complex color"
            />
          )}
          <input
            type="text"
            value={val}
            onChange={(e) => updateDraftSection(section, { [key]: e.target.value })}
            className="h-10 flex-1 rounded-xl border border-slate-300 px-3 text-sm dark:border-slate-700 dark:bg-slate-900 dark:text-white"
            placeholder="#000000 or linear-gradient(...)"
          />
        </div>
      </div>
    );
  };

  const tabs = [
    { id: "global", label: "Global", fields: [
      { key: "primary", label: "Primary Color", desc: "Used for primary actions." },
      { key: "secondary", label: "Secondary Color" },
      { key: "accent", label: "Accent Color" },
      { key: "background", label: "Background Color" },
      { key: "surface", label: "Surface Color" },
      { key: "text", label: "Text Color" },
      { key: "mutedText", label: "Muted Text Color" },
      { key: "border", label: "Border Color" },
    ]},
    { id: "navbar", label: "Navbar", fields: [
      { key: "background", label: "Navbar Background" },
      { key: "text", label: "Navbar Text" },
      { key: "hoverText", label: "Navbar Hover Text" },
      { key: "activeText", label: "Navbar Active Text" },
      { key: "icon", label: "Navbar Icon" },
      { key: "border", label: "Navbar Border" },
      { key: "searchBackground", label: "Search Background" },
      { key: "searchText", label: "Search Text" },
    ]},
    { id: "footer", label: "Footer", fields: [
      { key: "background", label: "Footer Background" },
      { key: "text", label: "Footer Text" },
      { key: "heading", label: "Footer Heading" },
      { key: "link", label: "Footer Link" },
      { key: "hoverLink", label: "Footer Hover Link" },
      { key: "border", label: "Footer Border" },
      { key: "newsletterBackground", label: "Newsletter Background" },
      { key: "newsletterButton", label: "Newsletter Button" },
    ]},
    { id: "productGrid", label: "Product Grid", fields: [
      { key: "cardBackground", label: "Card Background" },
      { key: "cardBorder", label: "Card Border" },
      { key: "title", label: "Title Color" },
      { key: "price", label: "Price Color" },
      { key: "oldPrice", label: "Old Price Color" },
      { key: "discountBackground", label: "Discount Badge Background" },
      { key: "discountText", label: "Discount Badge Text" },
      { key: "rating", label: "Rating Color" },
      { key: "buttonBackground", label: "Button Background" },
      { key: "buttonText", label: "Button Text" },
      { key: "buttonHover", label: "Button Hover" },
    ]},
    { id: "buttons", label: "Buttons", fields: [
      { key: "primaryBackground", label: "Primary Background" },
      { key: "primaryText", label: "Primary Text" },
      { key: "primaryHover", label: "Primary Hover" },
      { key: "secondaryBackground", label: "Secondary Background" },
      { key: "secondaryText", label: "Secondary Text" },
      { key: "secondaryHover", label: "Secondary Hover" },
      { key: "border", label: "Button Border" },
    ]}
  ];

  const activeTabData = useMemo(() => tabs.find(t => t.id === activeTab), [activeTab]);

  // CSS variables for the live preview — built from the draft theme.
  // We always include every variable (with a fallback empty string) so the
  // entire variable map is sent in every postMessage update.
  const previewStyle = useMemo(() => {
    if (!draftTheme) return {};
    const vars = {};

    const map = {
      global: {
        primary: "--theme-primary", secondary: "--theme-secondary", accent: "--theme-accent",
        background: "--theme-background", surface: "--theme-surface", text: "--theme-text",
        mutedText: "--theme-muted-text", border: "--theme-border"
      },
      navbar: {
        background: "--theme-navbar-background", text: "--theme-navbar-text", hoverText: "--theme-navbar-hover",
        activeText: "--theme-navbar-active", icon: "--theme-navbar-icon", border: "--theme-navbar-border",
        searchBackground: "--theme-search-background", searchText: "--theme-search-text"
      },
      footer: {
        background: "--theme-footer-background", text: "--theme-footer-text", heading: "--theme-footer-heading",
        link: "--theme-footer-link", hoverLink: "--theme-footer-link-hover", border: "--theme-footer-border",
        newsletterBackground: "--theme-newsletter-background", newsletterButton: "--theme-newsletter-button",
        newsletterText: "--theme-newsletter-text"
      },
      productGrid: {
        cardBackground: "--theme-product-card-background", cardBorder: "--theme-product-card-border",
        title: "--theme-product-title", price: "--theme-product-price", oldPrice: "--theme-product-old-price",
        discountBackground: "--theme-product-discount-background", discountText: "--theme-product-discount-text",
        rating: "--theme-product-rating", buttonBackground: "--theme-product-button-background",
        buttonText: "--theme-product-button-text", buttonHover: "--theme-product-button-hover"
      },
      buttons: {
        primaryBackground: "--theme-primary-button", primaryText: "--theme-primary-button-text",
        primaryHover: "--theme-primary-button-hover", secondaryBackground: "--theme-secondary-button",
        secondaryText: "--theme-secondary-button-text", secondaryHover: "--theme-secondary-button-hover",
        border: "--theme-button-border"
      }
    };

    // global uses "colors" internally in schema
    Object.entries(map.global).forEach(([k, v]) => { if (draftTheme.colors?.[k]) vars[v] = draftTheme.colors[k]; });
    Object.entries(map.navbar).forEach(([k, v]) => { if (draftTheme.navbar?.[k]) vars[v] = draftTheme.navbar[k]; });
    Object.entries(map.footer).forEach(([k, v]) => { if (draftTheme.footer?.[k]) vars[v] = draftTheme.footer[k]; });
    Object.entries(map.productGrid).forEach(([k, v]) => { if (draftTheme.productGrid?.[k]) vars[v] = draftTheme.productGrid[k]; });
    Object.entries(map.buttons).forEach(([k, v]) => { if (draftTheme.buttons?.[k]) vars[v] = draftTheme.buttons[k]; });

    return vars;
  }, [draftTheme]);

  const iframeRef = useRef(null);

  // Broadcast theme variable updates into the iframe via postMessage.
  // The storefront's ThemeContext listens for "THEME_PREVIEW_UPDATE" messages
  // and applies the CSS variable overrides, persistently re-applying them even
  // after its own active-theme API fetch completes.
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const sendTheme = () => {
      try {
        iframe.contentWindow?.postMessage(
          { type: "THEME_PREVIEW_UPDATE", variables: previewStyle },
          window.location.origin
        );
      } catch (e) {
        // Silently ignore any cross-origin or other errors
      }
    };

    // Send immediately (if the iframe is already loaded)
    sendTheme();

    // Also re-send on every subsequent iframe navigation/reload
    iframe.addEventListener("load", sendTheme);
    return () => iframe.removeEventListener("load", sendTheme);
  }, [previewStyle]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading themes...</div>;
  }

  return (
    <div className="flex h-[calc(100vh-80px)] flex-col">
      {/* Header */}
      <header className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white px-6 py-4 dark:border-slate-800 dark:bg-slate-900">
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">Dynamic Theme</h1>
          <p className="text-sm text-slate-500">Customize your storefront appearance and preview changes in real time.</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleReset} disabled={!draftTheme} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300">
            <RotateCcw className="h-4 w-4" /> Reset
          </button>
          <button onClick={saveDraft} disabled={!draftTheme || saving} className="flex items-center gap-2 rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300">
            <Save className="h-4 w-4" /> {saving ? "Saving..." : "Save Draft"}
          </button>
          <button onClick={handleActivate} disabled={!draftTheme || activating || draftTheme.isActive} className="flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:opacity-50 dark:bg-emerald-600">
            <Check className="h-4 w-4" /> {activating ? "Activating..." : "Activate Theme"}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        
        {/* Editor Sidebar */}
        <aside className="flex w-80 flex-col border-r border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/50">
          <div className="p-4 border-b border-slate-200 dark:border-slate-800">
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Select Theme</label>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              value={selectedTheme?._id || ""}
              onChange={(e) => selectTheme(e.target.value)}
            >
              <option value="" disabled>-- Select Theme --</option>
              {themes.map(t => (
                <option key={t._id} value={t._id}>
                  {t.name} {t.isActive ? "(Active)" : ""}
                </option>
              ))}
            </select>
            <div className="mt-3 flex gap-2">
              <button onClick={handleCreateNew} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Plus className="h-3 w-3" /> New
              </button>
              <button onClick={handleDuplicate} disabled={!selectedTheme} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-white py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
                <Copy className="h-3 w-3" /> Duplicate
              </button>
              <button onClick={handleDelete} disabled={!selectedTheme || selectedTheme.isActive} className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-rose-200 bg-white py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/50 dark:bg-slate-800 dark:text-rose-400">
                <Trash2 className="h-3 w-3" /> Delete
              </button>
            </div>
          </div>

          <div className="flex border-b border-slate-200 overflow-x-auto scrollbar-hide dark:border-slate-800">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={`whitespace-nowrap px-4 py-3 text-sm font-medium transition ${activeTab === t.id ? "border-b-2 border-slate-900 text-slate-900 dark:border-white dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {draftTheme ? (
              activeTabData?.fields.map(f => renderColorInput(activeTab === "global" ? "colors" : activeTab, f.key, f.label, f.desc))
            ) : (
              <div className="text-center text-sm text-slate-500 mt-10">Select a theme to edit.</div>
            )}
          </div>
        </aside>

        {/* Live Preview Area */}
        <main className="flex flex-1 flex-col bg-slate-100 dark:bg-slate-950">
          <div className="flex items-center justify-center gap-2 p-2 bg-slate-200 dark:bg-slate-800">
            <button onClick={() => setPreviewMode("desktop")} className={`rounded p-1.5 ${previewMode === "desktop" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"}`}><Monitor className="h-4 w-4" /></button>
            <button onClick={() => setPreviewMode("tablet")} className={`rounded p-1.5 ${previewMode === "tablet" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"}`}><Tablet className="h-4 w-4" /></button>
            <button onClick={() => setPreviewMode("mobile")} className={`rounded p-1.5 ${previewMode === "mobile" ? "bg-white shadow dark:bg-slate-700" : "text-slate-500"}`}><Smartphone className="h-4 w-4" /></button>
          </div>
          <div className="flex-1 overflow-hidden p-4 flex items-center justify-center">
            <div 
              className={`h-full w-full bg-white transition-all duration-300 ease-in-out shadow-lg overflow-hidden rounded-xl ring-1 ring-slate-900/5 ${previewMode === 'mobile' ? 'max-w-[390px]' : previewMode === 'tablet' ? 'max-w-[768px]' : 'max-w-full'}`}
            >
              <iframe
                ref={iframeRef}
                src="/"
                title="Theme Preview"
                className="h-full w-full border-none pointer-events-auto"
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
