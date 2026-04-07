export function addMonths(date: Date, months: number): Date {
  const d = new Date(date);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function subMonths(date: Date, months: number): Date {
  return addMonths(date, -months);
}

export function formatDateInputValue(date: Date | null | undefined): string {
  if (!date) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function parseDateInputValue(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map((v) => Number(v));
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
