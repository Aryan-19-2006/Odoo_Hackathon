const FREQUENCIES = new Set(['daily', 'weekly', 'monthly', 'yearly']);

function addBillingPeriod(date, frequency, anchorDate = date) {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) {
    throw new TypeError('A valid date is required');
  }
  if (!(anchorDate instanceof Date) || Number.isNaN(anchorDate.getTime())) {
    throw new TypeError('A valid anchor date is required');
  }
  if (!FREQUENCIES.has(frequency)) {
    throw new TypeError('Unsupported billing frequency');
  }

  const result = new Date(date.getTime());
  if (frequency === 'daily') {
    result.setUTCDate(result.getUTCDate() + 1);
  } else if (frequency === 'weekly') {
    result.setUTCDate(result.getUTCDate() + 7);
  } else if (frequency === 'monthly') {
    const day = anchorDate.getUTCDate();
    result.setUTCDate(1);
    result.setUTCMonth(result.getUTCMonth() + 1);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0)).getUTCDate();
    result.setUTCDate(Math.min(day, lastDay));
  } else {
    const month = anchorDate.getUTCMonth();
    const day = anchorDate.getUTCDate();
    result.setUTCDate(1);
    result.setUTCFullYear(result.getUTCFullYear() + 1);
    const lastDay = new Date(Date.UTC(result.getUTCFullYear(), month + 1, 0)).getUTCDate();
    result.setUTCMonth(month);
    result.setUTCDate(Math.min(day, lastDay));
  }
  return result;
}

module.exports = { addBillingPeriod };
