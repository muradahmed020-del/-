import { Row, ParsedPeriod } from '../types';

export const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
export const EN_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

export const MONTH_NAMES = [
  'জানুয়ারি',
  'ফেব্রুয়ারি',
  'মার্চ',
  'এপ্রিল',
  'মে',
  'জুন',
  'জুলাই',
  'আগস্ট',
  'সেপ্টেম্বর',
  'অক্টোবর',
  'নভেম্বর',
  'ডিসেম্বর',
];

export function toBnDigits(str: string | number): string {
  return String(str).replace(/[0-9]/g, (d) => BN_DIGITS[parseInt(d, 10)]);
}

export function toEnDigits(str: string | number): string {
  return String(str).replace(/[০-৯]/g, (d) => String(BN_DIGITS.indexOf(d)));
}

export function fmt(n: number | string | null | undefined): string {
  if (n === '' || n === null || n === undefined) return '';
  const num = typeof n === 'number' ? n : parseFloat(toEnDigits(n));
  if (isNaN(num)) return '';
  return num.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function bnMoney(n: number | string | null | undefined): string {
  return toBnDigits(fmt(n));
}

export function formatReceiptNo(n: number): string {
  return toBnDigits(String(n).padStart(3, '0'));
}

export function formatInvoiceNo(n: number): string {
  return toBnDigits(String(n).padStart(4, '0'));
}

export function todayDMY(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = String(d.getFullYear());
  return toBnDigits(`${dd}/${mm}/${yyyy}`);
}

export function todayBn(): string {
  return new Date().toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function due(row: Row): number | '' {
  const pStr = toEnDigits(row.price || '');
  const cStr = toEnDigits(row.cash || '');
  const p = parseFloat(pStr);
  const c = parseFloat(cStr);
  if (isNaN(p) && isNaN(c)) return '';
  return (isNaN(p) ? 0 : p) - (isNaN(c) ? 0 : c);
}

export function isRowFilled(row: Row): boolean {
  return !!(row.date || row.subject || row.price || row.cash || row.comment);
}

export function rowHasMeaningfulData(row: Row): boolean {
  return !!(row.subject || row.price || row.cash || row.comment);
}

export function parseRowDate(dateStr: string): { day: number | null; month: number | null; year: number | null } | null {
  if (!dateStr) return null;
  const raw = String(dateStr).trim();
  const en = toEnDigits(raw);
  let month: number | null = null;
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (raw.includes(MONTH_NAMES[i])) {
      month = i + 1;
      break;
    }
  }
  const nums = (en.match(/\d+/g) || []).map((n) => parseInt(n, 10));
  if (month) {
    let day: number | null = null;
    let year: number | null = null;
    nums.forEach((n) => {
      if (String(n).length >= 4) year = n;
      else if (day === null) day = n;
    });
    return { day, month, year };
  }
  if (nums.length >= 3) {
    let [d, m, y] = nums;
    if (y < 100) y += 2000;
    return { day: d, month: m, year: y };
  }
  if (nums.length === 2) {
    let [m, y] = nums;
    if (y < 100) y += 2000;
    return { day: null, month: m, year: y };
  }
  if (nums.length === 1 && String(nums[0]).length === 4) {
    return { day: null, month: null, year: nums[0] };
  }
  return null;
}

export function splitRangeQuery(q: string): string[] | null {
  const wordSeps = [/\s*থেকে\s*/i, /\s+to\s+/i, /\s*–\s*/, /\s*—\s*/, /\s*~\s*/];
  for (const sep of wordSeps) {
    if (sep.test(q)) {
      const parts = q.split(sep).map((s) => s.trim()).filter(Boolean);
      if (parts.length === 2) return parts;
    }
  }
  const hyphenCount = (q.match(/-/g) || []).length;
  if (hyphenCount === 1) {
    const parts = q.split('-').map((s) => s.trim()).filter(Boolean);
    if (parts.length === 2) return parts;
  }
  return null;
}

export function parseSinglePeriod(q: string): ParsedPeriod | null {
  q = (q || '').trim();
  if (!q) return null;
  const en = toEnDigits(q);
  let month: number | null = null;
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    if (q.includes(MONTH_NAMES[i])) {
      month = i + 1;
      break;
    }
  }
  const nums = (en.match(/\d+/g) || []).map((n) => parseInt(n, 10));
  if (month) {
    let day: number | null = null;
    let year: number | null = null;
    nums.forEach((n) => {
      if (String(n).length >= 4) year = n;
      else if (day === null) day = n;
    });
    if (day !== null) return { type: 'date', day, month, year };
    return { type: 'month', month, year };
  }
  if (nums.length >= 3) {
    let [d, m, y] = nums;
    if (y < 100) y += 2000;
    return { type: 'date', day: d, month: m, year: y };
  }
  if (nums.length === 2) {
    let [m, y] = nums;
    if (y < 100) y += 2000;
    return { type: 'month', month: m, year: y };
  }
  if (nums.length === 1) {
    if (String(nums[0]).length === 4) return { type: 'year', year: nums[0] };
    return { type: 'month', month: nums[0], year: null };
  }
  return { type: 'keyword', keyword: q };
}

export function parsePeriodQuery(q: string): ParsedPeriod | null {
  q = (q || '').trim();
  if (!q) return null;
  const rangeParts = splitRangeQuery(q);
  if (rangeParts) {
    const start = parseSinglePeriod(rangeParts[0]);
    const end = parseSinglePeriod(rangeParts[1]);
    if (start && end && start.type !== 'keyword' && end.type !== 'keyword') {
      return { type: 'range', start, end };
    }
  }
  return parseSinglePeriod(q);
}

export function daysInMonth(month: number, year: number): number {
  return new Date(year, month, 0).getDate();
}

export function periodBoundaryValue(p: ParsedPeriod, isEnd: boolean): number {
  const year = p.year || 2026;
  const month = p.month != null ? p.month : isEnd ? 12 : 1;
  const day = p.day != null ? p.day : isEnd ? daysInMonth(month, year) : 1;
  return year * 10000 + month * 100 + day;
}

export function rowMatchesPeriod(row: Row, period: ParsedPeriod | null): boolean {
  if (!period) return true;
  if (period.type === 'keyword') {
    return (row.date || '').toLowerCase().includes((period.keyword || '').toLowerCase());
  }
  const parsed = parseRowDate(row.date);
  if (!parsed) return false;
  if (period.type === 'date') {
    return parsed.day === period.day && parsed.month === period.month && (period.year ? parsed.year === period.year : true);
  }
  if (period.type === 'month') {
    return parsed.month === period.month && (period.year ? parsed.year === period.year : true);
  }
  if (period.type === 'year') {
    return parsed.year === period.year;
  }
  if (period.type === 'range' && period.start && period.end) {
    if (parsed.year == null) return false;
    const rowVal = parsed.year * 10000 + (parsed.month || 1) * 100 + (parsed.day || 1);
    const startVal = periodBoundaryValue(period.start, false);
    const endVal = periodBoundaryValue(period.end, true);
    return rowVal >= Math.min(startVal, endVal) && rowVal <= Math.max(startVal, endVal);
  }
  return true;
}

export function periodLabel(period: ParsedPeriod | null): string {
  if (!period) return 'সব সময়কাল';
  if (period.type === 'keyword') return `"${period.keyword}" লেখা তারিখ`;
  if (period.type === 'date')
    return `তারিখঃ ${toBnDigits(period.day || 1)}/${toBnDigits(period.month || 1)}${
      period.year ? '/' + toBnDigits(period.year) : ''
    }`;
  if (period.type === 'month')
    return `মাসঃ ${MONTH_NAMES[(period.month || 1) - 1] || period.month}${
      period.year ? ' ' + toBnDigits(period.year) : ''
    }`;
  if (period.type === 'year') return `বছরঃ ${toBnDigits(period.year || '')}`;
  if (period.type === 'range') return `${periodLabel(period.start || null)} — থেকে — ${periodLabel(period.end || null)}`;
  return 'সব সময়কাল';
}

export function calcNoteTotals(text: string): { plus: number; minus: number; net: number; count: number } {
  let plus = 0;
  let minus = 0;
  let count = 0;
  String(text || '').split('\n').forEach((rawLine) => {
    let line = toEnDigits(rawLine);
    if (/মোট|total|=/i.test(line)) return;
    line = line.replace(/\d+[-\/.]\d+[-\/.]\d+/g, ' ').replace(/\d{10,}/g, ' ');
    const re = /([+\-−–])?(\d[\d,]*(?:\.\d+)?)/g;
    let m;
    while ((m = re.exec(line)) !== null) {
      const val = parseFloat(m[2].replace(/,/g, ''));
      if (isNaN(val)) continue;
      const isMinus = m[1] === '-' || m[1] === '−' || m[1] === '–';
      if (isMinus) minus += val;
      else plus += val;
      count++;
    }
  });
  plus = Math.round(plus * 100) / 100;
  minus = Math.round(minus * 100) / 100;
  return { plus, minus, net: Math.round((plus - minus) * 100) / 100, count };
}

export function toIntlPhone(raw: string): string {
  let d = (raw || '').replace(/[^0-9]/g, '');
  if (!d) return '';
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('880')) return d;
  if (d.startsWith('0')) return '880' + d.slice(1);
  if (d.length === 10) return '880' + d;
  return d;
}

export function simpleHash(str: string): string {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h * 33) ^ str.charCodeAt(i)) >>> 0;
  }
  return h.toString(16);
}
