import React, { useState } from 'react';
import { TrendingUp, Printer, FileSpreadsheet, Share2, CheckCircle, MessageSquare } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Sheet } from '../types';
import { fmt, toBnDigits, due, parseRowDate, MONTH_NAMES } from '../utils/bengali';

interface ReportSectionProps {
  sheets: Sheet[];
  onClose: () => void;
  onSendDueReminder: (sIdx: number, aIdx: number) => void;
  onSendAllDueReminders: () => void;
  onMarkAccountPaid: (sIdx: number, aIdx: number) => void;
  onPrintReportA4: (html: string) => void;
  onPrintReportThermal: (html: string) => void;
}

export const ReportSection: React.FC<ReportSectionProps> = ({
  sheets,
  onClose,
  onSendDueReminder,
  onSendAllDueReminders,
  onMarkAccountPaid,
  onPrintReportA4,
  onPrintReportThermal,
}) => {
  const [tab, setTab] = useState<'time' | 'due' | 'product'>('time');
  const [selectedCustomerIdx, setSelectedCustomerIdx] = useState<number>(0);
  const [granularity, setGranularity] = useState<'daily' | 'weekly' | 'monthly' | 'yearly'>('monthly');
  const [productScope, setProductScope] = useState<string>('all');

  // Customer rows extraction with parsed dates
  const currentSheet = sheets[selectedCustomerIdx] || sheets[0];

  interface ParsedRow {
    year: number;
    month: number;
    day: number;
    price: number;
    cash: number;
    dueAmt: number;
    subject: string;
    comment: string;
  }

  const parsedRows: ParsedRow[] = [];
  if (currentSheet) {
    currentSheet.accounts.forEach((acc) => {
      acc.rows.forEach((r) => {
        const parsed = parseRowDate(r.date);
        if (parsed && parsed.year && parsed.month && parsed.day) {
          const p = parseFloat(r.price) || 0;
          const c = parseFloat(r.cash) || 0;
          const d = due(r);
          parsedRows.push({
            year: parsed.year,
            month: parsed.month,
            day: parsed.day,
            price: p,
            cash: c,
            dueAmt: d === '' ? 0 : d,
            subject: r.subject,
            comment: r.comment,
          });
        }
      });
    });
  }

  // Helper for Friday week start
  const weekStartFriday = (y: number, m: number, d: number) => {
    const jsDate = new Date(y, m - 1, d);
    const day = jsDate.getDay();
    const diff = (day - 5 + 7) % 7;
    return new Date(jsDate.getFullYear(), jsDate.getMonth(), jsDate.getDate() - diff);
  };

  // Group rows by granularity
  interface GroupItem {
    label: string;
    sortKey: number;
    count: number;
    price: number;
    cash: number;
    dueAmt: number;
    diffPrice?: number | null;
    diffDue?: number | null;
  }

  const groupMap = new Map<string, GroupItem>();
  parsedRows.forEach((r) => {
    let key = '';
    let label = '';
    let sortKey = 0;

    if (granularity === 'daily') {
      key = `${r.year}-${r.month}-${r.day}`;
      sortKey = r.year * 10000 + r.month * 100 + r.day;
      label = `${toBnDigits(String(r.day).padStart(2, '0'))}/${toBnDigits(String(r.month).padStart(2, '0'))}/${toBnDigits(r.year)}`;
    } else if (granularity === 'weekly') {
      const ws = weekStartFriday(r.year, r.month, r.day);
      key = String(ws.getTime());
      sortKey = ws.getTime();
      const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
      label = `${toBnDigits(ws.getDate())}/${toBnDigits(ws.getMonth() + 1)} – ${toBnDigits(we.getDate())}/${toBnDigits(we.getMonth() + 1)}/${toBnDigits(we.getFullYear())}`;
    } else if (granularity === 'yearly') {
      key = String(r.year);
      sortKey = r.year;
      label = `${toBnDigits(r.year)}`;
    } else {
      key = `${r.year}-${r.month}`;
      sortKey = r.year * 100 + r.month;
      label = `${MONTH_NAMES[r.month - 1]} ${toBnDigits(r.year)}`;
    }

    if (!groupMap.has(key)) {
      groupMap.set(key, { label, sortKey, count: 0, price: 0, cash: 0, dueAmt: 0 });
    }
    const g = groupMap.get(key)!;
    g.count++;
    g.price += r.price;
    g.cash += r.cash;
    g.dueAmt += r.dueAmt;
  });

  const sortedGroups = Array.from(groupMap.values()).sort((a, b) => a.sortKey - b.sortKey);

  // Month-over-month differences
  if (granularity === 'monthly') {
    sortedGroups.forEach((g, idx) => {
      if (idx === 0) {
        g.diffPrice = null;
        g.diffDue = null;
      } else {
        const prev = sortedGroups[idx - 1];
        g.diffPrice = g.price - prev.price;
        g.diffDue = g.dueAmt - prev.dueAmt;
      }
    });
  }

  // Totals
  const totalCount = sortedGroups.reduce((s, g) => s + g.count, 0);
  const totalPrice = sortedGroups.reduce((s, g) => s + g.price, 0);
  const totalCash = sortedGroups.reduce((s, g) => s + g.cash, 0);
  const totalDue = sortedGroups.reduce((s, g) => s + g.dueAmt, 0);

  // Due List calculation
  interface DueEntry {
    sIdx: number;
    aIdx: number;
    customerName: string;
    accountName: string;
    multi: boolean;
    dueAmt: number;
    daysSince: number | null;
  }
  const allDueEntries: DueEntry[] = [];
  sheets.forEach((s, sIdx) => {
    s.accounts.forEach((acc, aIdx) => {
      let accDue = 0;
      let lastDate: Date | null = null;
      acc.rows.forEach((r) => {
        const d = due(r);
        if (d !== '') accDue += d;
        const parsed = parseRowDate(r.date);
        if (parsed && parsed.year && parsed.month && parsed.day) {
          const cur = new Date(parsed.year, parsed.month - 1, parsed.day);
          if (!lastDate || cur > lastDate) lastDate = cur;
        }
      });
      if (accDue > 0.5) {
        let daysSince: number | null = null;
        if (lastDate) {
          const now = new Date();
          now.setHours(0, 0, 0, 0);
          const targetTime = (lastDate as Date).getTime();
          daysSince = Math.round((now.getTime() - targetTime) / (1000 * 60 * 60 * 24));
        }
        allDueEntries.push({
          sIdx,
          aIdx,
          customerName: s.name,
          accountName: acc.name,
          multi: s.accounts.length > 1,
          dueAmt: accDue,
          daysSince,
        });
      }
    });
  });
  allDueEntries.sort((a, b) => b.dueAmt - a.dueAmt);
  const grandDueTotal = allDueEntries.reduce((s, e) => s + e.dueAmt, 0);

  // Product/Subject breakdown
  interface ProductItem {
    subject: string;
    count: number;
    price: number;
  }
  const productMap = new Map<string, ProductItem>();
  const targetSheets = productScope === 'all' ? sheets : [sheets[Number(productScope)]].filter(Boolean);

  targetSheets.forEach((s) => {
    s.accounts.forEach((acc) => {
      acc.rows.forEach((r) => {
        const subj = (r.subject || '').trim() || '(বিষয় লেখা নেই)';
        if (!productMap.has(subj)) {
          productMap.set(subj, { subject: subj, count: 0, price: 0 });
        }
        const item = productMap.get(subj)!;
        item.count++;
        item.price += parseFloat(r.price) || 0;
      });
    });
  });
  const productList = Array.from(productMap.values()).sort((a, b) => b.price - a.price);
  const productGrandPrice = productList.reduce((s, p) => s + p.price, 0);

  // Export Time Report to Excel (with 4 tabs)
  const handleExportTimeExcel = () => {
    if (!currentSheet) return;
    const wb = XLSX.utils.book_new();

    const generateGranularityAoA = (gran: 'daily' | 'weekly' | 'monthly' | 'yearly') => {
      const gMap = new Map<string, GroupItem>();
      parsedRows.forEach((r) => {
        let key = '';
        let label = '';
        let sortKey = 0;
        if (gran === 'daily') {
          key = `${r.year}-${r.month}-${r.day}`;
          sortKey = r.year * 10000 + r.month * 100 + r.day;
          label = `${r.day}/${r.month}/${r.year}`;
        } else if (gran === 'weekly') {
          const ws = weekStartFriday(r.year, r.month, r.day);
          key = String(ws.getTime());
          sortKey = ws.getTime();
          const we = new Date(ws.getFullYear(), ws.getMonth(), ws.getDate() + 6);
          label = `${ws.getDate()}/${ws.getMonth() + 1} - ${we.getDate()}/${we.getMonth() + 1}/${we.getFullYear()}`;
        } else if (gran === 'yearly') {
          key = String(r.year);
          sortKey = r.year;
          label = String(r.year);
        } else {
          key = `${r.year}-${r.month}`;
          sortKey = r.year * 100 + r.month;
          label = `${MONTH_NAMES[r.month - 1]} ${r.year}`;
        }
        if (!gMap.has(key)) gMap.set(key, { label, sortKey, count: 0, price: 0, cash: 0, dueAmt: 0 });
        const g = gMap.get(key)!;
        g.count++;
        g.price += r.price;
        g.cash += r.cash;
        g.dueAmt += r.dueAmt;
      });
      const list = Array.from(gMap.values()).sort((a, b) => a.sortKey - b.sortKey);
      const aoa: any[][] = [['সময়কাল', 'এন্ট্রি সংখ্যা', 'মোট মূল্য', 'মোট নগদ', 'মোট বাকি']];
      list.forEach((g) => {
        aoa.push([g.label, g.count, g.price, g.cash, g.dueAmt]);
      });
      return aoa;
    };

    const granLabels = { daily: 'দৈনিক', weekly: 'সাপ্তাহিক', monthly: 'মাসিক', yearly: 'বাৎসরিক' };
    (['daily', 'weekly', 'monthly', 'yearly'] as const).forEach((g) => {
      const ws = XLSX.utils.aoa_to_sheet(generateGranularityAoA(g));
      XLSX.utils.book_append_sheet(wb, ws, granLabels[g]);
    });

    const safeName = currentSheet.name.replace(/[\\/*?:\[\]]/g, '').trim() || 'Customer';
    XLSX.writeFile(wb, `রিপোর্ট_${safeName}.xlsx`);
  };

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden mb-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-[#FAF8F5] p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3E36] text-white">
            <TrendingUp className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif-bn text-lg font-bold text-[#1C1917]">
              আর্থিক ও বাণিজ্যিক রিপোর্ট
            </h2>
            <p className="text-xs text-[#78716C]">
              সময়ভিত্তিক লেনদেন, বকেয়া বিশ্লেষণ ও শীর্ষ পণ্যের হিসাব
            </p>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-1 rounded-xl bg-[#F3EFE6] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('time')}
            className={`rounded-lg px-3 py-1.5 transition ${
              tab === 'time' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            সময়ভিত্তিক রিপোর্ট
          </button>
          <button
            type="button"
            onClick={() => setTab('due')}
            className={`rounded-lg px-3 py-1.5 transition ${
              tab === 'due' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            বাকির তালিকা ({toBnDigits(allDueEntries.length)})
          </button>
          <button
            type="button"
            onClick={() => setTab('product')}
            className={`rounded-lg px-3 py-1.5 transition ${
              tab === 'product' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            পণ্য/বিষয় সারাংশ
          </button>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[#E6DFD3] bg-white px-3 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-[#F8F6F0] transition"
        >
          ✕ বন্ধ করুন
        </button>
      </div>

      {/* Tab 1: Time-based report */}
      {tab === 'time' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-white p-3 sm:px-6 text-xs">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <label className="font-semibold text-[#78716C]">গ্রাহকঃ</label>
                <select
                  value={selectedCustomerIdx}
                  onChange={(e) => setSelectedCustomerIdx(Number(e.target.value))}
                  className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
                >
                  {sheets.map((s, idx) => (
                    <option key={idx} value={idx}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-1.5">
                <label className="font-semibold text-[#78716C]">সময়কালঃ</label>
                <select
                  value={granularity}
                  onChange={(e) => setGranularity(e.target.value as any)}
                  className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
                >
                  <option value="daily">দৈনিক</option>
                  <option value="weekly">সাপ্তাহিক (শুক্রবার থেকে শুরু)</option>
                  <option value="monthly">মাসিক</option>
                  <option value="yearly">বাৎসরিক</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExportTimeExcel}
                className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-white transition"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-700" /> ⇩ এক্সেল
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = document.getElementById('timeReportTableArea')?.innerHTML || '';
                  onPrintReportA4(`<h1 class="print-title">${currentSheet.name} — সময়ভিত্তিক রিপোর্ট</h1>${content}`);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C28B1E] px-3.5 py-1.5 text-xs font-bold text-[#1C1917] shadow-xs hover:bg-[#D4A33B]"
              >
                <Printer className="h-3.5 w-3.5" /> প্রিন্ট (A4)
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = document.getElementById('timeReportTableArea')?.innerHTML || '';
                  onPrintReportThermal(`<div class="t-center t-bold">${currentSheet.name} — সময়ভিত্তিক রিপোর্ট</div>${content}`);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25]"
              >
                <Printer className="h-3.5 w-3.5" /> থার্মাল
              </button>
            </div>
          </div>

          <div id="timeReportTableArea" className="p-4 sm:p-6 overflow-x-auto">
            {sortedGroups.length === 0 ? (
              <p className="py-16 text-center text-xs text-[#78716C]">
                এই কাস্টমারের কোনো এন্ট্রিতে পূর্ণ তারিখ (দিন/মাস/বছর) পাওয়া যায়নি
              </p>
            ) : (
              <div className="space-y-6">
                {/* SVG Trend Bar Chart */}
                {(granularity === 'monthly' || granularity === 'yearly') && sortedGroups.length > 0 && (
                  <div className="rounded-2xl border border-[#E6DFD3] bg-[#FAF8F5] p-4 sm:p-5">
                    <h4 className="font-serif-bn font-bold text-xs text-[#0F3E36] mb-3">
                      বিক্রির গ্রাফ / ট্রেন্ড ({currentSheet.name})
                    </h4>
                    <div className="flex items-end gap-3 h-36 pt-4 px-2 overflow-x-auto">
                      {(() => {
                        const maxVal = Math.max(1, ...sortedGroups.map((g) => g.price));
                        return sortedGroups.map((g, idx) => {
                          const barH = Math.max(8, Math.round((g.price / maxVal) * 105));
                          return (
                            <div key={idx} className="flex flex-col items-center gap-1.5 flex-1 min-w-[45px]">
                              <span className="font-mono-num text-[10px] text-[#1C1917] font-bold">
                                {fmt(g.price)}
                              </span>
                              <div
                                style={{ height: `${barH}px` }}
                                className="w-full rounded-t-lg bg-[#0F3E36] hover:bg-[#C28B1E] transition-colors"
                              />
                              <span className="text-[10px] text-[#78716C] truncate w-full text-center">
                                {g.label}
                              </span>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}

                <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
                  <table className="w-full text-xs sm:text-sm border-collapse">
                    <thead>
                      <tr className="border-b border-[#E6DFD3] bg-[#FAF8F5] text-[#57534E] text-left">
                        <th className="py-2.5 px-4 font-bold">সময়কাল</th>
                        <th className="py-2.5 px-3 text-right font-bold">এন্ট্রি</th>
                        <th className="py-2.5 px-3 text-right font-bold">মোট মূল্য</th>
                        <th className="py-2.5 px-3 text-right font-bold text-emerald-800">মোট নগদ</th>
                        <th className="py-2.5 px-3 text-right font-bold text-[#991B1B]">মোট বাকি</th>
                        {granularity === 'monthly' && (
                          <>
                            <th className="py-2.5 px-3 text-right font-bold">বিক্রি পরিবর্তন</th>
                            <th className="py-2.5 px-3 text-right font-bold">বাকি পরিবর্তন</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE1]">
                      {sortedGroups.map((g, idx) => (
                        <tr key={idx} className="hover:bg-[#FAF8F5] transition">
                          <td className="py-2.5 px-4 font-bold text-[#1C1917]">{g.label}</td>
                          <td className="py-2.5 px-3 text-right font-mono-num text-[#78716C]">
                            {toBnDigits(g.count)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-[#1C1917]">
                            ৳{fmt(g.price)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-semibold text-emerald-800">
                            ৳{fmt(g.cash)}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                            ৳{fmt(g.dueAmt)}
                          </td>
                          {granularity === 'monthly' && (
                            <>
                              <td
                                className={`py-2.5 px-3 text-right font-mono-num font-bold ${
                                  (g.diffPrice || 0) > 0
                                    ? 'text-emerald-700'
                                    : (g.diffPrice || 0) < 0
                                    ? 'text-[#991B1B]'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {g.diffPrice === null || g.diffPrice === undefined
                                  ? '—'
                                  : (g.diffPrice > 0 ? '+' : '') + fmt(g.diffPrice)}
                              </td>
                              <td
                                className={`py-2.5 px-3 text-right font-mono-num font-bold ${
                                  (g.diffDue || 0) > 0
                                    ? 'text-[#991B1B]'
                                    : (g.diffDue || 0) < 0
                                    ? 'text-emerald-700'
                                    : 'text-neutral-400'
                                }`}
                              >
                                {g.diffDue === null || g.diffDue === undefined
                                  ? '—'
                                  : (g.diffDue > 0 ? '+' : '') + fmt(g.diffDue)}
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-[#E6DFD3] bg-[#FAF8F5] font-bold">
                        <td className="py-3 px-4 font-serif-bn text-sm text-[#0F3E36]">সর্বমোটঃ</td>
                        <td className="py-3 px-3 text-right font-mono-num text-[#78716C]">
                          {toBnDigits(totalCount)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-[#1C1917]">
                          ৳{fmt(totalPrice)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-emerald-800">
                          ৳{fmt(totalCash)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num text-[#991B1B]">
                          ৳{fmt(totalDue)}
                        </td>
                        {granularity === 'monthly' && <td colSpan={2}></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Due List */}
      {tab === 'due' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-white p-3 sm:px-6 text-xs">
            <div className="text-[#57534E]">
              মোট <b className="text-[#991B1B] font-bold">{toBnDigits(allDueEntries.length)}</b> টি হিসাবে বকেয়া বাকি রয়েছে
              (৩০ দিনের বেশি বকেয়া লালচে রঙে চিহ্নিত)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onSendAllDueReminders}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-emerald-800 active:scale-95 transition"
              >
                <MessageSquare className="h-3.5 w-3.5" /> সবাইকে WhatsApp তাগাদা
              </button>
              <button
                type="button"
                onClick={() => {
                  const content = document.getElementById('dueListTableArea')?.innerHTML || '';
                  onPrintReportA4(`<h1 class="print-title">বাকির তালিকা</h1>${content}`);
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-[#C28B1E] px-3.5 py-1.5 text-xs font-bold text-[#1C1917] shadow-xs hover:bg-[#D4A33B]"
              >
                <Printer className="h-3.5 w-3.5" /> প্রিন্ট (A4)
              </button>
            </div>
          </div>

          <div id="dueListTableArea" className="p-4 sm:p-6 overflow-x-auto">
            {allDueEntries.length === 0 ? (
              <p className="py-16 text-center text-xs text-[#78716C]">কোনো হিসাবে বাকি নেই</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6DFD3] bg-[#FAF8F5] text-[#57534E] text-left">
                      <th className="py-2.5 px-4 font-bold">কাস্টমার / হিসাব</th>
                      <th className="py-2.5 px-3 text-right font-bold text-[#991B1B]">বাকি পরিমাণ</th>
                      <th className="py-2.5 px-3 text-right font-bold">শেষ লেনদেন থেকে</th>
                      <th className="py-2.5 px-3 text-center font-bold no-print">তাগাদা</th>
                      <th className="py-2.5 px-3 text-center font-bold no-print">পরিশোধ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE1]">
                    {allDueEntries.map((e, idx) => {
                      const isOverdue = e.daysSince != null && e.daysSince >= 30;
                      return (
                        <tr
                          key={idx}
                          className={isOverdue ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-[#FAF8F5] transition'}
                        >
                          <td className="py-3 px-4 font-bold text-[#1C1917]">
                            {e.customerName}
                            {e.multi && <span className="font-normal text-[#78716C]"> ({e.accountName})</span>}
                          </td>
                          <td className="py-3 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                            ৳{fmt(e.dueAmt)}
                          </td>
                          <td
                            className={`py-3 px-3 text-right font-mono-num ${
                              isOverdue ? 'font-bold text-[#991B1B]' : 'text-[#78716C]'
                            }`}
                          >
                            {e.daysSince != null ? `${toBnDigits(e.daysSince)} দিন` : '—'}
                          </td>
                          <td className="py-3 px-3 text-center no-print">
                            <button
                              type="button"
                              title="WhatsApp তাগাদা পাঠান"
                              onClick={() => onSendDueReminder(e.sIdx, e.aIdx)}
                              className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-2.5 py-1 text-white text-[11px] font-bold hover:bg-emerald-800 transition active:scale-95"
                            >
                              <Share2 className="h-3 w-3" /> তাগাদা
                            </button>
                          </td>
                          <td className="py-3 px-3 text-center no-print">
                            <button
                              type="button"
                              title="বাকি পরিশোধ রেকর্ড করুন"
                              onClick={() => onMarkAccountPaid(e.sIdx, e.aIdx)}
                              className="inline-flex items-center gap-1 rounded-xl bg-[#C28B1E] px-2.5 py-1 text-[#1C1917] text-[11px] font-bold hover:bg-[#D4A33B] transition active:scale-95"
                            >
                              <CheckCircle className="h-3 w-3 text-emerald-950" /> পরিশোধ
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#E6DFD3] bg-[#FAF8F5] font-bold">
                      <td className="py-3 px-4 font-serif-bn text-sm text-[#991B1B]">সর্বমোট বকেয়া বাকিঃ</td>
                      <td className="py-3 px-3 text-right font-mono-num text-[#991B1B]">
                        ৳{fmt(grandDueTotal)}
                      </td>
                      <td colSpan={3}></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 3: Product / Subject Breakdown */}
      {tab === 'product' && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-white p-3 sm:px-6 text-xs">
            <div className="flex items-center gap-2">
              <label className="font-semibold text-[#78716C]">কাস্টমার নির্বাচনঃ</label>
              <select
                value={productScope}
                onChange={(e) => setProductScope(e.target.value)}
                className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
              >
                <option value="all">সব কাস্টমার মিলিয়ে</option>
                {sheets.map((s, idx) => (
                  <option key={idx} value={String(idx)}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={() => {
                const content = document.getElementById('productReportTableArea')?.innerHTML || '';
                onPrintReportA4(`<h1 class="print-title">পণ্য/বিষয় সারাংশ</h1>${content}`);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#C28B1E] px-3.5 py-1.5 text-xs font-bold text-[#1C1917] shadow-xs hover:bg-[#D4A33B]"
            >
              <Printer className="h-3.5 w-3.5" /> প্রিন্ট (A4)
            </button>
          </div>

          <div id="productReportTableArea" className="p-4 sm:p-6 overflow-x-auto">
            {productList.length === 0 ? (
              <p className="py-16 text-center text-xs text-[#78716C]">কোনো পণ্য বা এন্ট্রি নেই</p>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
                <table className="w-full text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-[#E6DFD3] bg-[#FAF8F5] text-[#57534E] text-left">
                      <th className="py-2.5 px-4 font-bold">বিষয় বা পণ্য</th>
                      <th className="py-2.5 px-3 text-right font-bold">এন্ট্রি সংখ্যা</th>
                      <th className="py-2.5 px-3 text-right font-bold">মোট বিক্রি</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F0EAE1]">
                    {productList.map((p, idx) => (
                      <tr key={idx} className="hover:bg-[#FAF8F5] transition">
                        <td className="py-3 px-4 font-bold text-[#1C1917]">{p.subject}</td>
                        <td className="py-3 px-3 text-right font-mono-num text-[#78716C]">
                          {toBnDigits(p.count)}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-bold text-[#1C1917]">
                          ৳{fmt(p.price)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-[#E6DFD3] bg-[#FAF8F5] font-bold">
                      <td className="py-3 px-4 font-serif-bn text-sm text-[#0F3E36]">সর্বমোটঃ</td>
                      <td className="py-3 px-3 text-right font-mono-num text-[#78716C]">
                        {toBnDigits(productList.reduce((s, x) => s + x.count, 0))}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num text-[#1C1917]">
                        ৳{fmt(productGrandPrice)}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
