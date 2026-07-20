import { useMemo, useState } from "react";
import { downloadReport } from "../services/reportingService";
import { buildDateRangeParams, defaultLast7Days } from "../utils/reporting";

function sameDate(left, right) {
  if (!left && !right) return true;
  if (!left || !right) return false;
  return left.getTime() === right.getTime();
}

function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return [start, end];
}

export function useReporting({ module, getFilters, onApply, exporter }) {
  const [initialStartDate, initialEndDate] = defaultLast7Days();
  const [draftDateRange, setDraftDateRange] = useState([initialStartDate, initialEndDate]);
  const [appliedDateRange, setAppliedDateRange] = useState([initialStartDate, initialEndDate]);
  const [exportingFormat, setExportingFormat] = useState("");
  const [toast, setToast] = useState(null);

  const [startDate, endDate] = draftDateRange;
  const [appliedStartDate, appliedEndDate] = appliedDateRange;
  const appliedParams = useMemo(
    () => buildDateRangeParams(appliedStartDate, appliedEndDate),
    [appliedEndDate, appliedStartDate]
  );

  function applyDateRange() {
    setAppliedDateRange([startDate || null, endDate || null]);
    onApply?.([startDate || null, endDate || null]);
  }

  function applyToday() {
    const nextRange = todayRange();
    setDraftDateRange(nextRange);
    setAppliedDateRange(nextRange);
    onApply?.(nextRange);
  }

  async function exportReport(format) {
    try {
      setExportingFormat(format);
      const exportFn = exporter || downloadReport;
      await exportFn({
        module,
        format,
        startDate: appliedStartDate,
        endDate: appliedEndDate,
        filters: getFilters?.() || {},
      });
      setToast({
        type: "success",
        message: `${format.toUpperCase()} report downloaded successfully.`,
      });
    } catch (error) {
      const message = error?.response?.data?.message || error?.message || "Failed to export report.";
      setToast({ type: "error", message });
      throw error;
    } finally {
      setExportingFormat("");
    }
  }

  return {
    startDate,
    endDate,
    setDateRange: setDraftDateRange,
    applyDateRange,
    applyToday,
    appliedStartDate,
    appliedEndDate,
    appliedParams,
    exportingFormat,
    exportReport,
    toast,
    clearToast: () => setToast(null),
    hasPendingChanges: !sameDate(startDate, appliedStartDate) || !sameDate(endDate, appliedEndDate),
  };
}
