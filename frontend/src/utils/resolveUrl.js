export function resolveApiAssetUrl(url) {
  if (!url) return url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;

  const base = (import.meta.env.VITE_API_URL || "http://localhost:5000").replace(
    /\/$/,
    ""
  );
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}

