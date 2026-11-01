import React, { useState } from 'react';
import { Printer, Search, X, Calendar, FileSpreadsheet } from 'lucide-react';
import { Sheet, ParsedPeriod } from '../types';
import { fmt, toBnDigits, due, rowMatchesPeriod, periodLabel, parsePeriodQuery, MONTH_NAMES } from '../utils/bengali';

interface AllSheetsViewProps {
  sheets: Sheet[];
  onClose: () => void;
  onPrintA4: (period: ParsedPeriod | null, mode: 'summary' | 'detail') => void;
  onPrintThermal: (period: ParsedPeriod | null, mode: 'summary' | 'detail') => void;
}

export const AllSheetsView: React.FC<AllSheetsViewProps> = ({
  sheets,
  onClose,
  onPrintA4,
  onPrintThermal,
}) => {
  const [mode, setMode] = useState<'summary' | 'detail'>('summary');
  const [selectedMonth, setSelectedMonth] = useState<number | ''>('');
  const [selectedDay, setSelectedDay] = useState<number | ''>('');
  const [yearQuery, setYearQuery] = useState('');

  // Build active filter period
  const activePeriod: ParsedPeriod | null = (() => {
    const yearParsed = yearQuery ? parsePeriodQuery(yearQuery) : null;
    if (yearParsed && yearParsed.type === 'range') {
      const baseType = selectedMonth ? (selectedDay ? 'date' : 'month') : 'year';
      return {
        type: 'range',
        start: {
          type: baseType,
          day: selectedDay ? Number(selectedDay) : null,
          month: selectedMonth ? Number(selectedMonth) : null,
          year: yearParsed.start?.year,
        },
        end: {
          type: baseType,
          day: selectedDay ? Number(selectedDay) : null,
          month: selectedMonth ? Number(selectedMonth) : null,
          year: yearParsed.end?.year,
        },
      };
    }
    const year = yearParsed && yearParsed.type === 'year' ? yearParsed.year : null;
    if (selectedDay && selectedMonth) {
      return { type: 'date', day: Number(selectedDay), month: Number(selectedMonth), year: year || null };
    }
    if (selectedMonth) {
      return { type: 'month', month: Number(selectedMonth), year: year || null };
    }
    if (year) {
      return { type: 'year', year };
    }
    return null;
  })();

  // Calculate summary rows
  let grandPrice = 0;
  let grandCash = 0;
  let grandDue = 0;
  let grandCount = 0;

  const summaryData = sheets
    .map((sheet) => {
      let p = 0;
      let c = 0;
      let d = 0;
      let cnt = 0;
      sheet.accounts.forEach((acc) => {
        acc.rows.forEach((r) => {
          if (!r.subject && !r.price && !r.cash && !r.comment) return;
          if (activePeriod && !rowMatchesPeriod(r, activePeriod)) return;
          const pr = parseFloat(r.price) || 0;
          const cs = parseFloat(r.cash) || 0;
          p += pr;
          c += cs;
          const du = due(r);
          if (du !== '') d += du;
          cnt++;
        });
      });
      grandPrice += p;
      grandCash += c;
      grandDue += d;
      grandCount += cnt;
      return { name: sheet.name, count: cnt, price: p, cash: c, due: d };
    })
    .filter((s) => !activePeriod || s.count > 0);

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden mb-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-[#FAF8F5] p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3E36] text-white">
            <FileSpreadsheet className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif-bn text-lg font-bold text-[#1C1917]">
              সব গ্রাহকের খাতার হিসাব ও বিবরণ
            </h2>
            <p className="text-xs text-[#78716C]">
              তারিখ, মাস ও বছর অনুযায়ী সকল খাতার সমন্বিত সারসংক্ষেপ ও পূর্ণাঙ্গ তালিকা
            </p>
          </div>
        </div>

        {/* Mode Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-[#F3EFE6] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setMode('summary')}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === 'summary' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            সারসংক্ষেপ
          </button>
          <button
            type="button"
            onClick={() => setMode('detail')}
            className={`rounded-lg px-3 py-1.5 transition ${
              mode === 'detail' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            বিস্তারিত খাতা
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

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center gap-2.5 border-b border-[#F0EAE1] bg-white p-3 sm:px-6 text-xs">
        <div className="flex items-center gap-1.5">
          <label className="font-semibold text-[#78716C]">মাসঃ</label>
          <select
            value={selectedMonth}
            onChange={(e) => {
              const v = e.target.value ? parseInt(e.target.value, 10) : '';
              setSelectedMonth(v);
              if (!v) setSelectedDay('');
            }}
            className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none"
          >
            <option value="">সব মাস</option>
            {MONTH_NAMES.map((m, i) => (
              <option key={i} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="font-semibold text-[#78716C]">দিনঃ</label>
          <select
            disabled={!selectedMonth}
            value={selectedDay}
            onChange={(e) => setSelectedDay(e.target.value ? parseInt(e.target.value, 10) : '')}
            className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:outline-none disabled:opacity-40"
          >
            <option value="">সব দিন</option>
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
              <option key={d} value={d}>
                {toBnDigits(d)}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5">
          <label className="font-semibold text-[#78716C]">বছর/রেঞ্জঃ</label>
          <input
            type="text"
            value={yearQuery}
            onChange={(e) => setYearQuery(e.target.value)}
            placeholder="যেমনঃ ২০২৬ বা ২০২০-২০২৬"
            className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] placeholder-[#78716C] focus:bg-white focus:outline-none min-w-[170px]"
          />
        </div>

        {(selectedMonth || yearQuery) && (
          <button
            type="button"
            onClick={() => {
              setSelectedMonth('');
              setSelectedDay('');
              setYearQuery('');
            }}
            className="rounded-xl border border-[#E6DFD3] bg-white px-2.5 py-1.5 text-xs font-semibold text-[#991B1B] hover:bg-neutral-50 transition"
          >
            ✕ পরিষ্কার
          </button>
        )}

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => onPrintA4(activePeriod, mode)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#C28B1E] px-3.5 py-1.5 text-xs font-bold text-[#1C1917] shadow-xs hover:bg-[#D4A33B] transition"
          >
            <Printer className="h-3.5 w-3.5" /> প্রিন্ট (A4)
          </button>
          <button
            type="button"
            onClick={() => onPrintThermal(activePeriod, mode)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] transition"
          >
            <Printer className="h-3.5 w-3.5" /> থার্মাল
          </button>
        </div>
      </div>

      {activePeriod && (
        <div className="bg-[#FFFBEB] px-6 py-2 text-xs text-[#92400E] font-semibold border-b border-[#E6DFD3] flex items-center gap-2">
          <Calendar className="h-3.5 w-3.5" /> সক্রিয় সময়কাল ফিল্টারঃ {periodLabel(activePeriod)}
        </div>
      )}

      {/* View Body */}
      <div className="p-4 sm:p-6 overflow-x-auto">
        {mode === 'summary' ? (
          <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="border-b border-[#E6DFD3] bg-[#FAF8F5] text-[#57534E] text-left">
                  <th className="py-2.5 px-4 font-bold">গ্রাহকের নাম</th>
                  <th className="py-2.5 px-3 text-right font-bold">মোট এন্ট্রি</th>
                  <th className="py-2.5 px-3 text-right font-bold">মোট বিক্রি</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-800">মোট নগদ</th>
                  <th className="py-2.5 px-3 text-right font-bold text-[#991B1B]">মোট বকেয়া বাকি</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {summaryData.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#78716C]">
                      কোনো এন্ট্রি পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  summaryData.map((s, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3 px-4 font-bold text-[#1C1917]">{s.name}</td>
                      <td className="py-3 px-3 text-right font-mono-num text-[#78716C]">
                        {toBnDigits(s.count)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold text-[#1C1917]">
                        ৳{fmt(s.price)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold text-emerald-800">
                        ৳{fmt(s.cash)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                        ৳{fmt(s.due)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#E6DFD3] bg-[#FAF8F5] font-bold">
                  <td className="py-3 px-4 font-serif-bn text-sm text-[#0F3E36]">সর্বমোটঃ</td>
                  <td className="py-3 px-3 text-right font-mono-num text-[#78716C]">
                    {toBnDigits(grandCount)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num text-[#1C1917]">
                    ৳{fmt(grandPrice)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num text-emerald-800">
                    ৳{fmt(grandCash)}
                  </td>
                  <td className="py-3 px-3 text-right font-mono-num text-[#991B1B]">
                    ৳{fmt(grandDue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="space-y-6">
            {sheets.map((sheet, sIdx) => {
              const multi = sheet.accounts.length > 1;
              return (
                <div key={sIdx} className="rounded-2xl border border-[#E6DFD3] bg-[#FAF8F5] p-5 space-y-4">
                  <h3 className="font-serif-bn text-base font-bold text-[#0F3E36] pb-2 border-b border-[#E6DFD3]">
                    {sheet.name}
                  </h3>
                  {sheet.accounts.map((acc, aIdx) => {
                    const filteredRows = acc.rows.filter(
                      (r) =>
                        (r.subject || r.price || r.cash || r.comment) &&
                        (!activePeriod || rowMatchesPeriod(r, activePeriod))
                    );
                    if (filteredRows.length === 0) return null;

                    let tp = 0;
                    let tc = 0;
                    let td = 0;

                    return (
                      <div key={aIdx} className="space-y-2">
                        {multi && (
                          <h4 className="text-xs font-bold text-[#57534E]">
                            ↳ হিসাবঃ {acc.name} ({toBnDigits(filteredRows.length)} টি এন্ট্রি)
                          </h4>
                        )}
                        <div className="overflow-x-auto rounded-xl border border-[#E6DFD3] bg-white">
                          <table className="w-full text-xs border-collapse">
                            <thead>
                              <tr className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6DFD3] text-left">
                                <th className="py-2.5 px-3 font-bold">তারিখ</th>
                                <th className="py-2.5 px-3 font-bold">বিষয়</th>
                                <th className="py-2.5 px-3 text-right font-bold">মূল্য</th>
                                <th className="py-2.5 px-3 text-right font-bold text-emerald-800">নগদ</th>
                                <th className="py-2.5 px-3 text-right font-bold text-[#991B1B]">বাকি</th>
                                <th className="py-2.5 px-3 font-bold">মন্তব্য</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#F0EAE1]">
                              {filteredRows.map((r, rIdx) => {
                                const p = parseFloat(r.price) || 0;
                                const c = parseFloat(r.cash) || 0;
                                const d = due(r);
                                tp += p;
                                tc += c;
                                if (d !== '') td += d;
                                return (
                                  <tr key={rIdx} className="hover:bg-[#FAF8F5] transition">
                                    <td className="py-2 px-3 text-[#78716C]">{r.date}</td>
                                    <td className="py-2 px-3 font-semibold text-[#1C1917]">{r.subject}</td>
                                    <td className="py-2 px-3 text-right font-mono-num font-semibold text-[#1C1917]">
                                      {r.price ? `৳${fmt(r.price)}` : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono-num font-semibold text-emerald-800">
                                      {r.cash ? `৳${fmt(r.cash)}` : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                                      {d !== '' ? `৳${fmt(d)}` : '—'}
                                    </td>
                                    <td className="py-2 px-3 text-[#57534E]">{r.comment}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                            <tfoot>
                              <tr className="border-t border-[#E6DFD3] bg-[#FAF8F5] font-bold text-[11px]">
                                <td colSpan={2} className="py-2.5 px-3 text-[#0F3E36]">
                                  উপমোটঃ
                                </td>
                                <td className="py-2.5 px-3 text-right font-mono-num text-[#1C1917]">৳{fmt(tp)}</td>
                                <td className="py-2.5 px-3 text-right font-mono-num text-emerald-800">৳{fmt(tc)}</td>
                                <td className="py-2.5 px-3 text-right font-mono-num text-[#991B1B]">৳{fmt(td)}</td>
                                <td></td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
