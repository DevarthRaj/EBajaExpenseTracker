// ============================================================
// Formatters — currency, date, percentage
// ============================================================

/**
 * Format a number as Indian Rupees: ₹1,23,456.78
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Format a date string (ISO) as "28 Jun 2025"
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format a datetime string as "28 Jun 2025, 11:45 PM"
 */
export function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * Returns today's date as YYYY-MM-DD string for form defaults
 */
export function todayISODate(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Returns a list of the last N weeks as labels, e.g. ["Jun 2", "Jun 9", ...]
 */
export function lastNWeekLabels(n: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i * 7);
    labels.push(
      d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    );
  }
  return labels;
}

/**
 * Group expenses by ISO week (YYYY-Www) and return sums
 */
export function groupByWeek(
  expenses: { date: string; amount: number }[],
  nWeeks: number
): number[] {
  const now = new Date();
  const sums = new Array(nWeeks).fill(0);

  expenses.forEach(({ date, amount }) => {
    const d = new Date(date);
    const diffMs = now.getTime() - d.getTime();
    const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000));
    const idx = nWeeks - 1 - diffWeeks;
    if (idx >= 0 && idx < nWeeks) {
      sums[idx] += amount;
    }
  });

  return sums;
}

/**
 * Group expenses by month name and return sums (last N months)
 */
export function groupByMonth(
  expenses: { date: string; amount: number }[],
  nMonths: number
): { label: string; value: number }[] {
  const now = new Date();
  const results: { label: string; value: number }[] = [];

  for (let i = nMonths - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    results.push({
      label: d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' }),
      value: 0,
    });
  }

  expenses.forEach(({ date, amount }) => {
    const d = new Date(date);
    const diffMonths =
      (now.getFullYear() - d.getFullYear()) * 12 +
      (now.getMonth() - d.getMonth());
    const idx = nMonths - 1 - diffMonths;
    if (idx >= 0 && idx < nMonths) {
      results[idx].value += amount;
    }
  });

  return results;
}
