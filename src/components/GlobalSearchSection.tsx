import React, { useState } from 'react';
import { Search, ArrowRight, CornerDownLeft, X } from 'lucide-react';
import { Sheet } from '../types';
import { fmt, toBnDigits, toEnDigits, due, isRowFilled } from '../utils/bengali';

function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

interface HighlightTextProps {
  text: string | undefined | null;
  query: string;
  className?: string;
  highlightClassName?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({
  text,
  query,
  className = '',
  highlightClassName = 'bg-amber-200 text-amber-950 font-bold px-1 py-0.5 rounded-sm shadow-2xs',
}) => {
  if (!text) return null;
  const q = query.trim();
  if (!q) return <span className={className}>{text}</span>;

  // Support both original query, English digits, and Bengali digits variations
  const qEn = toEnDigits(q);
  const qBn = toBnDigits(q);
  const terms = Array.from(new Set([q, qEn, qBn].filter((t) => t && t.length > 0)));

  const regexPattern = terms.map(escapeRegExp).join('|');
  if (!regexPattern) return <span className={className}>{text}</span>;

  try {
    const regex = new RegExp(`(${regexPattern})`, 'gi');
    const parts = text.split(regex);

    return (
      <span className={className}>
        {parts.map((part, i) => {
          const isMatch = terms.some((t) => t.toLowerCase() === part.toLowerCase());
          return isMatch ? (
            <mark key={i} className={highlightClassName}>
              {part}
            </mark>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          );
        })}
      </span>
    );
  } catch {
    return <span className={className}>{text}</span>;
  }
};

interface GlobalSearchSectionProps {
  sheets: Sheet[];
  onClose: () => void;
  onSelectResult: (sIdx: number, aIdx: number) => void;
}

export const GlobalSearchSection: React.FC<GlobalSearchSectionProps> = ({
  sheets,
  onClose,
  onSelectResult,
}) => {
  const [query, setQuery] = useState('');

  interface SearchHit {
    sIdx: number;
    aIdx: number;
    customerName: string;
    accountName: string;
    multi: boolean;
    date: string;
    subject: string;
    category?: string;
    price: string;
    cash: string;
    dueAmt: number | '';
    comment: string;
  }

  const hits: SearchHit[] = [];
  const q = query.trim().toLowerCase();

  if (q) {
    sheets.forEach((sheet, sIdx) => {
      sheet.accounts.forEach((acc, aIdx) => {
        acc.rows.forEach((r) => {
          if (!isRowFilled(r)) return;
          const hay = `${r.date || ''} ${r.subject || ''} ${r.category || ''} ${r.comment || ''} ${sheet.name} ${acc.name} ${r.price || ''} ${r.cash || ''}`.toLowerCase();
          if (hay.includes(q)) {
            hits.push({
              sIdx,
              aIdx,
              customerName: sheet.name,
              accountName: acc.name,
              multi: sheet.accounts.length > 1,
              date: r.date,
              subject: r.subject,
              category: r.category,
              price: r.price,
              cash: r.cash,
              dueAmt: due(r),
              comment: r.comment,
            });
          }
        });
      });
    });
  }

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden mb-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#F0EAE1] bg-[#FAF8F5] p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3E36] text-white">
            <Search className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif-bn text-lg font-bold text-[#1C1917]">
              সার্বজনীন খাতা অনুসন্ধান (Global Search)
            </h2>
            <p className="text-xs text-[#78716C]">
              সকল গ্রাহক, হিসাব, পণ্যের বিবরণ, তারিখ ও মন্তব্য মিলিয়ে এক সাথে অনুসন্ধান
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-[#E6DFD3] bg-white px-3 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-[#F8F6F0] transition"
        >
          ✕ বন্ধ করুন
        </button>
      </div>

      <div className="p-4 sm:p-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-[#78716C]" />
          <input
            type="text"
            value={query}
            autoFocus
            onChange={(e) => setQuery(e.target.value)}
            placeholder="তারিখ, বিষয়, ক্যাটাগরি, মন্তব্য বা কাস্টমারের নাম লিখুন..."
            className="w-full rounded-2xl border border-[#E6DFD3] bg-[#FAF8F5] py-3 pl-10 pr-10 text-sm text-[#1C1917] placeholder-[#78716C] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3E36] shadow-2xs"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-3.5 p-1 rounded-lg text-neutral-400 hover:text-neutral-700 hover:bg-neutral-100 transition"
              title="অনুসন্ধান মুছুন"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {q ? (
          <div className="space-y-2">
            <div className="text-xs text-[#78716C] font-semibold flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span>
                  ফলাফলঃ <b className="text-[#0F3E36] font-bold">{toBnDigits(hits.length)}</b> টি এন্ট্রি পাওয়া গেছে
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-100/80 border border-amber-200/80 text-amber-900 px-2 py-0.5 text-[11px] font-medium">
                  অনুসন্ধানঃ "{query.trim()}"
                </span>
              </div>
              <span className="text-[11px] text-[#0F3E36] flex items-center gap-1">
                <CornerDownLeft className="h-3 w-3" /> সারিতে ক্লিক করলে সরাসরি সেই গ্রাহকের খাতায় যাবে
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
              <table className="w-full text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6DFD3] text-left select-none">
                    <th className="py-2.5 px-4 font-bold">গ্রাহক ও হিসাব</th>
                    <th className="py-2.5 px-3 font-bold">তারিখ</th>
                    <th className="py-2.5 px-3 font-bold">বিষয় বা বিবরণ</th>
                    <th className="py-2.5 px-3 font-bold">ক্যাটাগরি</th>
                    <th className="py-2.5 px-3 text-right font-bold">মূল্য</th>
                    <th className="py-2.5 px-3 text-right font-bold text-emerald-800">নগদ</th>
                    <th className="py-2.5 px-3 text-right font-bold text-[#991B1B]">বাকি</th>
                    <th className="py-2.5 px-3 font-bold">মন্তব্য</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F0EAE1]">
                  {hits.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-[#78716C]">
                        কোনো মিল পাওয়া যায়নি
                      </td>
                    </tr>
                  ) : (
                    hits.map((hit, idx) => (
                      <tr
                        key={idx}
                        onClick={() => {
                          onSelectResult(hit.sIdx, hit.aIdx);
                          onClose();
                        }}
                        className="hover:bg-[#FAF8F5] cursor-pointer transition-colors group"
                      >
                        <td className="py-3 px-4 font-bold text-[#0F3E36]">
                          <HighlightText text={hit.customerName} query={query} />
                          {hit.multi && (
                            <span className="font-normal text-[#78716C]">
                              {' ('}
                              <HighlightText text={hit.accountName} query={query} />
                              {')'}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-[#78716C] whitespace-nowrap">
                          <HighlightText text={hit.date} query={query} />
                        </td>
                        <td className="py-3 px-3 font-medium text-[#1C1917]">
                          <HighlightText text={hit.subject} query={query} />
                        </td>
                        <td className="py-3 px-3">
                          {hit.category ? (
                            <span className="inline-block rounded-md bg-[#FAF8F5] border border-[#E6DFD3] px-2 py-0.5 text-xs font-semibold text-[#0F3E36]">
                              <HighlightText text={hit.category} query={query} />
                            </span>
                          ) : (
                            <span className="text-[#A8A29E]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-semibold text-[#1C1917]">
                          {hit.price ? `৳${fmt(hit.price)}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-semibold text-emerald-800">
                          {hit.cash ? `৳${fmt(hit.cash)}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                          {hit.dueAmt !== '' ? `৳${fmt(hit.dueAmt)}` : '—'}
                        </td>
                        <td className="py-3 px-3 text-[#57534E]">
                          <HighlightText text={hit.comment} query={query} />
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="py-16 text-center text-xs text-[#78716C]">
            গ্রাহকের নাম, ফোন, তারিখ বা পণ্যের বিবরণ লিখে অনুসন্ধান করুন
          </div>
        )}
      </div>
    </div>
  );
};
