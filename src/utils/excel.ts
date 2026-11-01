import * as XLSX from 'xlsx';
import { Sheet, Note, Row } from '../types';
import { due, toEnDigits } from './bengali';

export const ACCOUNT_SEP = ' · ';
export const NOTES_SHEET_NAME = 'নোটবুক';
export const DEFAULT_ACCOUNT_NAME = 'সাধারণ হিসাব';

export function emptyRow(): Row {
  return { date: '', subject: '', price: '', cash: '', comment: '' };
}

export function buildWorkbook(sheets: Sheet[], notes: Note[]): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  const usedNames = new Set<string>();

  sheets.forEach((sheet) => {
    sheet.accounts.forEach((account) => {
      const aoa: any[][] = [];
      const heading = sheet.accounts.length > 1 ? `${sheet.name}${ACCOUNT_SEP}${account.name}` : sheet.name;
      aoa.push([heading, '', '', '', '', '', '']);
      aoa.push(['তারিখ', 'বিষয়', 'ক্যাটাগরি', 'মূল্য', 'নগদ', 'বাকি', 'মন্তব্য']);

      const startRow = 3; // 1-indexed data start
      account.rows.forEach((row) => {
        const pStr = toEnDigits(row.price || '');
        const cStr = toEnDigits(row.cash || '');
        const p = pStr === '' ? '' : parseFloat(pStr) || 0;
        const c = cStr === '' ? '' : parseFloat(cStr) || 0;
        const d = due(row);
        aoa.push([
          row.date || '',
          row.subject || '',
          row.category || '',
          p,
          c,
          d === '' ? '' : d,
          row.comment || '',
        ]);
      });

      const lastDataRow = 2 + Math.max(account.rows.length, 1);
      let totalP = 0;
      let totalC = 0;
      let totalD = 0;
      account.rows.forEach((row) => {
        const p = parseFloat(toEnDigits(row.price || '')) || 0;
        const c = parseFloat(toEnDigits(row.cash || '')) || 0;
        const d = due(row);
        totalP += p;
        totalC += c;
        totalD += d === '' ? 0 : d;
      });

      aoa.push(['', '', '', 'মোট মূল্য', 'নগদ', 'বাকি', '']);
      aoa.push([
        'সর্বমোটঃ',
        '',
        '',
        { t: 'n', v: totalP, f: `SUBTOTAL(109,D${startRow}:D${lastDataRow})` },
        { t: 'n', v: totalC, f: `SUBTOTAL(109,E${startRow}:E${lastDataRow})` },
        { t: 'n', v: totalD, f: `SUBTOTAL(109,F${startRow}:F${lastDataRow})` },
        '',
      ]);

      const ws = XLSX.utils.aoa_to_sheet(aoa);
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
      ws['!cols'] = [{ wch: 14 }, { wch: 30 }, { wch: 18 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 28 }];
      ws['!autofilter'] = { ref: `A2:G${lastDataRow}` };

      const safeName = heading.replace(/[\\/*?:\[\]]/g, '').slice(0, 31) || 'Sheet';
      let finalName = safeName;
      let n = 2;
      while (usedNames.has(finalName)) {
        const suffix = ` (${n})`;
        finalName = safeName.slice(0, 31 - suffix.length) + suffix;
        n++;
      }
      usedNames.add(finalName);
      XLSX.utils.book_append_sheet(wb, ws, finalName);
    });
  });

  if (notes.length > 0) {
    const pad = (n: number) => String(n).padStart(2, '0');
    const tsStr = (ms: number) => {
      if (!ms) return '';
      const d = new Date(ms);
      return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    };
    const naoa: any[][] = [
      [NOTES_SHEET_NAME, '', '', '', '', '', ''],
      ['ক্রম', 'শিরোনাম', 'নোট', 'অটো যোগ-বিয়োগ', 'পিন', 'তৈরির সময়', 'সর্বশেষ পরিবর্তন'],
    ];
    notes.forEach((n, i) => {
      naoa.push([
        i + 1,
        n.title || '',
        n.text || '',
        n.calc ? 'হ্যাঁ' : '',
        n.pinned ? 'হ্যাঁ' : '',
        tsStr(n.createdAt),
        tsStr(n.updatedAt),
      ]);
    });
    const nws = XLSX.utils.aoa_to_sheet(naoa);
    nws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 6 } }];
    nws['!cols'] = [{ wch: 7 }, { wch: 28 }, { wch: 60 }, { wch: 16 }, { wch: 8 }, { wch: 18 }, { wch: 18 }];
    let nName = NOTES_SHEET_NAME;
    let k = 2;
    while (usedNames.has(nName)) {
      nName = `${NOTES_SHEET_NAME} (${k})`;
      k++;
    }
    usedNames.add(nName);
    XLSX.utils.book_append_sheet(wb, nws, nName);
  }

  return wb;
}

export function parseWorkbookIntoSheets(wb: XLSX.WorkBook): Sheet[] {
  const customerMap = new Map<string, Sheet>();
  const order: Sheet[] = [];

  wb.SheetNames.forEach((sn) => {
    const ws = wb.Sheets[sn];
    const rows2d: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });

    let headerIdx = -1;
    for (let i = 0; i < rows2d.length; i++) {
      const r = rows2d[i];
      if (r && String(r[0]).trim() === 'তারিখ') {
        headerIdx = i;
        break;
      }
    }
    if (headerIdx === -1) return;

    let heading = sn;
    if (headerIdx > 0) {
      const hr = rows2d[headerIdx - 1];
      if (hr && String(hr[0] || '').trim()) heading = String(hr[0]).trim();
    }

    let customerName = heading;
    let accountName = DEFAULT_ACCOUNT_NAME;
    const sepIdx = heading.indexOf(ACCOUNT_SEP);
    if (sepIdx > -1) {
      customerName = heading.slice(0, sepIdx).trim() || heading;
      accountName = heading.slice(sepIdx + ACCOUNT_SEP.length).trim() || DEFAULT_ACCOUNT_NAME;
    }

    const headerRow = rows2d[headerIdx] || [];
    const hasCategoryCol = headerRow.some((h: any) => String(h || '').trim().includes('ক্যাটাগরি'));

    const dataRows: Row[] = [];
    for (let i = headerIdx + 1; i < rows2d.length; i++) {
      const r = rows2d[i] || [];
      const joined = r.join(' ');
      if (joined.includes('মোট মূল্য') || joined.includes('সর্বমোটঃ')) break;
      const a = (r[0] || '').toString().trim();
      const b = (r[1] || '').toString().trim();
      let cat = '';
      let c = '';
      let d = '';
      let f = '';

      if (hasCategoryCol) {
        cat = (r[2] || '').toString().trim();
        c = (r[3] || '').toString().trim();
        d = (r[4] || '').toString().trim();
        f = (r[6] || '').toString().trim();
      } else {
        c = (r[2] || '').toString().trim();
        d = (r[3] || '').toString().trim();
        f = (r[5] || '').toString().trim();
      }

      if (!a && !b && !c && !d && !f && !cat) continue;
      dataRows.push({
        date: a,
        subject: b,
        category: cat,
        price: c,
        cash: d,
        comment: f,
      });
    }
    if (dataRows.length === 0) dataRows.push(emptyRow());

    if (!customerMap.has(customerName)) {
      const s: Sheet = {
        name: customerName,
        accounts: [],
        activeAccountIdx: 0,
        tag: '',
        phone: '',
      };
      customerMap.set(customerName, s);
      order.push(s);
    }
    customerMap.get(customerName)!.accounts.push({
      name: accountName,
      rows: dataRows,
      filter: { date: '', keyword: '' },
      phone: '',
    });
  });

  return order;
}

export function parseNotesFromWorkbook(wb: XLSX.WorkBook): Note[] | null {
  let found = false;
  const result: Note[] = [];
  const parseTs = (str: any) => {
    const t = String(str || '').trim();
    if (!t) return 0;
    const ms = new Date(t.replace(' ', 'T')).getTime();
    return isNaN(ms) ? 0 : ms;
  };

  wb.SheetNames.forEach((sn) => {
    const ws = wb.Sheets[sn];
    const rows2d: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false, defval: '' });
    let hi = -1;
    for (let i = 0; i < rows2d.length; i++) {
      const r = rows2d[i];
      if (r && String(r[0]).trim() === 'ক্রম' && String(r[1]).trim() === 'শিরোনাম') {
        hi = i;
        break;
      }
    }
    if (hi === -1) return;
    found = true;
    for (let i = hi + 1; i < rows2d.length; i++) {
      const r = rows2d[i] || [];
      const title = String(r[1] || '').trim();
      const text = String(r[2] || '').trim();
      if (!title && !text) continue;
      const created = parseTs(r[5]) || Date.now();
      const updated = parseTs(r[6]) || created;
      result.push({
        id: 0,
        title: title || '(শিরোনামহীন নোট)',
        text,
        calc: String(r[3] || '').trim() === 'হ্যাঁ',
        pinned: String(r[4] || '').trim() === 'হ্যাঁ',
        createdAt: created,
        updatedAt: updated,
      });
    }
  });

  return found ? result : null;
}
