export function parseSQLDate(dateString) {
  if (!dateString) return null;

  const parsed = new Date(dateString.replace(" ", "T"));
  return isNaN(parsed.getTime()) ? null : parsed;
}

export function formatDateTime(dateInput) {
  if (!dateInput) return "—";

  const date =
    typeof dateInput === "string" ? parseSQLDate(dateInput) : dateInput;

  if (!date) return "—";

  return date.toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDuration(decimalDays) {
  if (decimalDays === null || decimalDays === undefined || isNaN(decimalDays)) {
    return "---";
  }

  const totalHours = Math.round(parseFloat(decimalDays) * 24);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  return `${days}d, ${hours}hr${hours !== 1 ? "s" : ""}`;
}

export function formatVariance(variance) {
  if (variance === null || variance === undefined || isNaN(variance)) {
    return "N/A";
  }

  const numericVariance = parseFloat(variance);

  if (numericVariance === 0) {
    return "Perfect Match";
  }

  const absHours = Math.round(Math.abs(numericVariance) * 24);
  const days = Math.floor(absHours / 24);
  const hours = absHours % 24;
  const timeStr = `${days}d, ${hours}h`;

  if (numericVariance > 0) return `+${timeStr} (Delayed)`;
  return `-${timeStr} (Ahead)`;
}

export function addDecimalDays(dateInput, decimalDays) {
  const date =
    typeof dateInput === "string" ? parseSQLDate(dateInput) : dateInput;

  if (
    !date ||
    decimalDays === null ||
    decimalDays === undefined ||
    isNaN(decimalDays)
  ) {
    return null;
  }

  const millisecondsToAdd = parseFloat(decimalDays) * 24 * 60 * 60 * 1000;
  return new Date(date.getTime() + millisecondsToAdd);
}

export function calculateDiffInDays(startDate, endDate) {
  const start =
    typeof startDate === "string" ? parseSQLDate(startDate) : startDate;
  const end =
    typeof endDate === "string" ? parseSQLDate(endDate) : endDate;

  if (!start || !end) return null;

  const diffMs = end.getTime() - start.getTime();
  return diffMs / (1000 * 60 * 60 * 24);
}

export function getAnalytics(batchData) {
  if (!batchData) return null;

  const predictedDays = parseFloat(batchData.predicted_days);
  const plantedDate = parseSQLDate(batchData.date_planted);
  const actualDate = parseSQLDate(batchData.actual_germination_date);

  const predictedDate =
    plantedDate && !isNaN(predictedDays)
      ? addDecimalDays(plantedDate, predictedDays)
      : null;

  const actualDays =
    plantedDate && actualDate
      ? calculateDiffInDays(plantedDate, actualDate)
      : null;

  const variance =
    actualDays !== null && !isNaN(predictedDays)
      ? actualDays - predictedDays
      : null;

  return {
    predictedDays: !isNaN(predictedDays) ? predictedDays : null,
    predictedDate,
    actualDays,
    variance,
    isCompleted: !!actualDate,
  };
}