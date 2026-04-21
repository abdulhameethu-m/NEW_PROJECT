import { useEffect, useMemo, useState } from "react";
import * as categoryService from "../services/categoryService";

function normalizeError(error) {
  return error?.response?.data?.message || error?.message || "Failed to load categories";
}

export function useCategories(options = {}) {
  const { includeInactive = false } = options;
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadCategories() {
      setLoading(true);
      setError("");
      try {
        const response = includeInactive
          ? await categoryService.getAdminCategories()
          : await categoryService.getCategories();

        if (!cancelled) {
          setCategories(Array.isArray(response?.data) ? response.data : []);
        }
      } catch (err) {
        if (!cancelled) {
          setCategories([]);
          setError(normalizeError(err));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, [includeInactive]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name)),
    [categories]
  );

  return {
    categories: sortedCategories,
    loading,
    error,
    setCategories,
  };
}
