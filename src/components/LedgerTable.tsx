import React, { useState, useRef } from 'react';
import {
  Plus,
  Printer,
  Receipt,
  CheckCircle,
  Share2,
  Trash2,
  Calendar,
  Search,
  Smartphone,
  ChevronRight,
  Tag,
  Settings2,
  X,
  CircleDollarSign,
  Wallet,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { Sheet, Row } from '../types';
import { fmt, toBnDigits, toEnDigits, due, isRowFilled } from '../utils/bengali';

interface LedgerTableProps {
  sheet: Sheet;
  activeAccountIdx: number;
  categories: string[];
  onAddCategory: (cat: string) => void;
  onDeleteCategory: (cat: string) => void;
  onSelectAccount: (idx: number) => void;
  onAddAccount: () => void;
  onRenameAccount: (idx: number, newName: string) => void;
  onDeleteAccount: (idx: number) => void;
  onUpdateAccountPhone: (idx: number, phone: string) => void;
  onUpdateSheetName: (name: string) => void;
  onUpdateRows: (rows: Row[]) => void;
  onPrintSheetA4: () => void;
  onPrintSheetThermal: () => void;
  onPrintReceiptA4: () => void;
  onPrintReceiptThermal: () => void;
  onPrintAllReceiptA4: () => void;
  onPrintAllReceiptThermal: () => void;
  onSendAccountReminder: (idx: number) => void;
  onMarkAccountPaid: () => void;
}

export const LedgerTable: React.FC<LedgerTableProps> = ({
  sheet,
  activeAccountIdx,
  categories,
  onAddCategory,
  onDeleteCategory,
  onSelectAccount,
  onAddAccount,
  onRenameAccount,
  onDeleteAccount,
  onUpdateAccountPhone,
  onUpdateSheetName,
  onUpdateRows,
  onPrintSheetA4,
  onPrintSheetThermal,
  onPrintReceiptA4,
  onPrintReceiptThermal,
  onPrintAllReceiptA4,
  onPrintAllReceiptThermal,
  onSendAccountReminder,
  onMarkAccountPaid,
}) => {
  const account = sheet.accounts[activeAccountIdx] || sheet.accounts[0];
  const [dateFilter, setDateFilter] = useState('');
  const [keywordFilter, setKeywordFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [showCategoryManager, setShowCategoryManager] = useState(false);
  const [newCatInput, setNewCatInput] = useState('');
  const tableRef = useRef<HTMLTableElement>(null);

  // Calculate unique dates for date filter
  const uniqueDates = Array.from(
    new Set(account.rows.map((r) => (r.date || '').trim()).filter(Boolean))
  );

  // Filter rows
  const visibleIndices: number[] = [];
  account.rows.forEach((r, idx) => {
    let matchDate = true;
    let matchKw = true;
    let matchCategory = true;
    if (dateFilter && !(r.date || '').toLowerCase().includes(dateFilter.toLowerCase())) {
      matchDate = false;
    }
    if (keywordFilter) {
      const q = keywordFilter.toLowerCase();
      const content = `${r.subject || ''} ${r.comment || ''}`.toLowerCase();
      if (!content.includes(q)) matchKw = false;
    }
    if (categoryFilter === '__UNASSIGNED__') {
      if ((r.category || '').trim() !== '') matchCategory = false;
    } else if (categoryFilter) {
      if ((r.category || '').trim() !== categoryFilter) matchCategory = false;
    }
    if (matchDate && matchKw && matchCategory) visibleIndices.push(idx);
  });

  // Calculate serial map (numbered from bottom to top for persistent order)
  const serialMap = new Map<number, string>();
  let count = 0;
  for (let i = account.rows.length - 1; i >= 0; i--) {
    if (isRowFilled(account.rows[i])) {
      count++;
      serialMap.set(i, toBnDigits(count));
    }
  }

  // Calculate totals for visible rows (used for filtered table display)
  let totalPrice = 0;
  let totalCash = 0;
  let totalDue = 0;

  visibleIndices.forEach((idx) => {
    const r = account.rows[idx];
    const p = parseFloat(toEnDigits(r.price)) || 0;
    const c = parseFloat(toEnDigits(r.cash)) || 0;
    totalPrice += p;
    totalCash += c;
    const d = due(r);
    if (d !== '') totalDue += d;
  });

  // Calculate totals for currently selected customer's active account
  let accountTotalPrice = 0;
  let accountTotalCash = 0;
  let accountTotalDue = 0;
  let filledEntriesCount = 0;

  account.rows.forEach((r) => {
    if (isRowFilled(r)) filledEntriesCount++;
    const p = parseFloat(toEnDigits(r.price)) || 0;
    const c = parseFloat(toEnDigits(r.cash)) || 0;
    accountTotalPrice += p;
    accountTotalCash += c;
    const d = due(r);
    if (d !== '') accountTotalDue += d;
  });

  const collectionRate =
    accountTotalPrice > 0
      ? Math.min(100, Math.round((accountTotalCash / accountTotalPrice) * 100))
      : accountTotalCash > 0
      ? 100
      : 0;

  // Row operations
  const handleAddRowTop = () => {
    const defaultCat = categoryFilter && categoryFilter !== '__UNASSIGNED__' ? categoryFilter : '';
    const newRows = [
      { date: account.rows[0]?.date || '', subject: '', category: defaultCat, price: '', cash: '', comment: '' },
      ...account.rows,
    ];
    onUpdateRows(newRows);
  };

  const handleAddRowBelow = (index: number) => {
    const newRows = [...account.rows];
    newRows.splice(index + 1, 0, {
      date: account.rows[index]?.date || '',
      subject: '',
      category: account.rows[index]?.category || '',
      price: '',
      cash: '',
      comment: '',
    });
    onUpdateRows(newRows);
  };

  const handleDeleteRow = (index: number) => {
    if (account.rows.length <= 1) {
      onUpdateRows([{ date: '', subject: '', price: '', cash: '', comment: '' }]);
      return;
    }
    const r = account.rows[index];
    if (r.subject || r.price || r.cash) {
      if (!confirm(`"${r.subject || r.date || 'এই এন্ট্রি'}" সারিটি মুছে ফেলতে চান?`)) return;
    }
    const newRows = account.rows.filter((_, i) => i !== index);
    onUpdateRows(newRows);
  };

  const handleCellChange = (rowIndex: number, field: keyof Row, val: string) => {
    const newRows = [...account.rows];
    if (field === 'price' || field === 'cash') {
      newRows[rowIndex] = { ...newRows[rowIndex], [field]: toEnDigits(val) };
    } else {
      newRows[rowIndex] = { ...newRows[rowIndex], [field]: val };
    }
    onUpdateRows(newRows);
  };

  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden flex flex-col">
      {/* Customer Sheet Header */}
      <div className="p-4 sm:p-5 border-b border-[#F0EAE1] bg-[#FAF8F5] flex flex-wrap items-center justify-between gap-4">
        {/* Customer Name Title & Phone */}
        <div className="flex flex-wrap items-center gap-3">
          <input
            type="text"
            value={sheet.name}
            onChange={(e) => onUpdateSheetName(e.target.value)}
            className="font-serif-bn text-xl sm:text-2xl font-bold text-[#1C1917] bg-transparent border-b border-dashed border-transparent hover:border-[#D8D0C2] focus:border-[#C28B1E] focus:outline-none transition-colors"
            title="নাম পরিবর্তন করতে ক্লিক করুন"
          />
          {sheet.phone ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-white border border-[#E6DFD3] px-2.5 py-0.5 text-xs text-[#57534E]">
              <Smartphone className="h-3 w-3 text-emerald-700" /> {sheet.phone}
            </span>
          ) : null}
          {sheet.tag && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200/80 px-2 py-0.5 text-[11px] font-semibold text-amber-900">
              🏷️ {sheet.tag}
            </span>
          )}
        </div>

        {/* Active Account Identity Pill */}
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E6DFD3] px-3 py-1 text-xs font-semibold text-[#0F3E36] shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-emerald-600" />
            হিসাবঃ <b className="font-bold">{account.name}</b>
          </span>
          <span className="text-xs text-[#78716C] font-mono-num hidden sm:inline">
            ({toBnDigits(filledEntriesCount)} টি লেনদেন)
          </span>
        </div>
      </div>

      {/* New 'Quick Summary' Card for Active Account */}
      <div className="p-4 sm:p-5 border-b border-[#F0EAE1] bg-gradient-to-b from-[#FAF8F5] to-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[#0F3E36]/10 text-[#0F3E36]">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h3 className="font-serif-bn text-sm font-bold text-[#1C1917] flex items-center gap-2">
              <span>হিসাব সারসংক্ষেপ (Quick Summary)</span>
              <span className="text-xs font-normal text-[#78716C]">
                — {sheet.name} ({account.name})
              </span>
            </h3>
          </div>
          {(dateFilter || keywordFilter || categoryFilter) && (
            <span className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 font-medium">
              * ফিল্টার সক্রিয় (নিচের টেবিলে {toBnDigits(visibleIndices.length)} টি এন্ট্রি)
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {/* 1. Total Price */}
          <div className="rounded-xl border border-[#E6DFD3] bg-white p-4 shadow-2xs hover:border-[#D8D0C2] transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-[#78716C] mb-2">
              <span className="flex items-center gap-1.5">
                <CircleDollarSign className="h-4 w-4 text-[#0F3E36]" />
                মোট মূল্য (বিক্রি)
              </span>
              <span className="text-[10px] rounded-md bg-[#FAF8F5] px-1.5 py-0.5 border border-[#E6DFD3] text-[#57534E]">
                Total Price
              </span>
            </div>
            <div className="flex items-baseline gap-1 font-mono-num text-2xl sm:text-3xl font-bold text-[#1C1917]">
              <span className="text-base font-normal text-[#78716C]">৳</span>
              <span>{fmt(accountTotalPrice)}</span>
            </div>
            <div className="mt-2 text-[11px] text-[#78716C] flex items-center justify-between pt-2 border-t border-[#F0EAE1]">
              <span>মোট এন্ট্রি সংখ্যাঃ</span>
              <span className="font-mono-num font-bold text-[#1C1917]">
                {toBnDigits(filledEntriesCount)} টি
              </span>
            </div>
          </div>

          {/* 2. Total Cash Received */}
          <div className="rounded-xl border border-emerald-200 bg-gradient-to-br from-emerald-50/40 to-white p-4 shadow-2xs hover:border-emerald-300 transition-colors flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-800 mb-2">
              <span className="flex items-center gap-1.5">
                <Wallet className="h-4 w-4 text-emerald-700" />
                মোট নগদ আদায়
              </span>
              <span className="text-[10px] rounded-md bg-emerald-100/70 border border-emerald-200 px-1.5 py-0.5 font-bold text-emerald-900 font-mono-num">
                {toBnDigits(collectionRate)}% আদায়
              </span>
            </div>
            <div className="flex items-baseline gap-1 font-mono-num text-2xl sm:text-3xl font-bold text-emerald-800">
              <span className="text-base font-normal text-emerald-600">৳</span>
              <span>{fmt(accountTotalCash)}</span>
            </div>
            <div className="mt-2 text-[11px] text-emerald-700/80 flex items-center justify-between pt-2 border-t border-emerald-100">
              <span>নগদ জমা প্রাপ্তিঃ</span>
              <span className="font-mono-num font-bold text-emerald-800">
                ৳{fmt(accountTotalCash)}
              </span>
            </div>
          </div>

          {/* 3. Remaining Total Due */}
          <div className={`rounded-xl border p-4 shadow-2xs transition-colors flex flex-col justify-between ${
            accountTotalDue > 0
              ? 'border-red-200 bg-gradient-to-br from-red-50/50 to-white hover:border-red-300'
              : 'border-emerald-200 bg-gradient-to-br from-emerald-50/30 to-white hover:border-emerald-300'
          }`}>
            <div className="flex items-center justify-between text-xs font-semibold mb-2">
              <span className={`flex items-center gap-1.5 ${accountTotalDue > 0 ? 'text-[#991B1B]' : 'text-emerald-800'}`}>
                {accountTotalDue > 0 ? (
                  <AlertCircle className="h-4 w-4 text-[#991B1B]" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-emerald-700" />
                )}
                অবশিষ্ট মোট বকেয়া
              </span>
              <span className={`text-[10px] rounded-md px-2 py-0.5 font-bold ${
                accountTotalDue > 0
                  ? 'bg-red-100 border border-red-200 text-[#991B1B]'
                  : 'bg-emerald-100 border border-emerald-200 text-emerald-800'
              }`}>
                {accountTotalDue > 0 ? 'বাকি রয়েছে' : 'পরিশোধিত'}
              </span>
            </div>
            <div className={`flex items-baseline gap-1 font-mono-num text-2xl sm:text-3xl font-bold ${
              accountTotalDue > 0 ? 'text-[#991B1B]' : 'text-emerald-800'
            }`}>
              <span className="text-base font-normal opacity-70">৳</span>
              <span>{fmt(accountTotalDue)}</span>
            </div>
            <div className={`mt-2 text-[11px] flex items-center justify-between pt-2 border-t ${
              accountTotalDue > 0
                ? 'border-red-100 text-[#991B1B]/80'
                : 'border-emerald-100 text-emerald-700/80'
            }`}>
              <span>{accountTotalDue > 0 ? 'বর্তমান পাওনা বাকিঃ' : 'বকেয়ার অবস্থাঃ'}</span>
              <span className="font-mono-num font-bold">
                {accountTotalDue > 0 ? `৳${fmt(accountTotalDue)}` : 'পরিশোধিত ✓'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Sub-Accounts (Multiple accounts per customer) Tabs */}
      <div className="border-b border-[#F0EAE1] bg-[#F8F6F0] px-4 pt-2.5">
        <div className="flex items-center justify-between text-xs pb-1.5">
          <span className="font-bold text-[#78716C]">
            হিসাব খাতা নির্বাচন (নাম বদলাতে ডাবল-ক্লিক):
          </span>
          {sheet.accounts.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onPrintAllReceiptA4}
                className="text-[11px] font-semibold text-[#0F3E36] hover:underline"
              >
                সব হিসাব একসাথে রশিদ (A4)
              </button>
              <span className="text-neutral-300">·</span>
              <button
                type="button"
                onClick={onPrintAllReceiptThermal}
                className="text-[11px] font-semibold text-[#0F3E36] hover:underline"
              >
                থার্মাল রশিদ
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5">
          {sheet.accounts.map((acc, aIdx) => {
            const isAcctActive = aIdx === activeAccountIdx;
            return (
              <div
                key={aIdx}
                onClick={() => onSelectAccount(aIdx)}
                onDoubleClick={() => {
                  const n = prompt('হিসাবের নতুন নাম লিখুন:', acc.name);
                  if (n && n.trim()) onRenameAccount(aIdx, n.trim());
                }}
                className={`group flex items-center gap-2 rounded-xl border px-3.5 py-1.5 text-xs font-semibold cursor-pointer whitespace-nowrap transition-all ${
                  isAcctActive
                    ? 'border-[#0F3E36] bg-[#0F3E36] text-white shadow-2xs font-bold'
                    : 'border-[#E6DFD3] bg-white text-[#57534E] hover:border-[#D8D0C2]'
                }`}
              >
                <span>{acc.name}</span>

                {/* Sub-account actions */}
                <div
                  className="flex items-center gap-1 pl-1 border-l border-current/20"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    type="button"
                    title="এই হিসাবের বাকির রিমাইন্ডার WhatsApp-এ পাঠান"
                    onClick={() => onSendAccountReminder(aIdx)}
                    className="hover:scale-110 transition-transform"
                  >
                    <Share2 className="h-3 w-3 text-emerald-400" />
                  </button>
                  {sheet.accounts.length > 1 && (
                    <button
                      type="button"
                      title="হিসাব মুছুন"
                      onClick={() => onDeleteAccount(aIdx)}
                      className="hover:scale-110 transition-transform text-red-300"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={onAddAccount}
            title="নতুন হিসাব যোগ করুন"
            className="flex items-center gap-1 rounded-xl border border-dashed border-[#78716C] px-3 py-1.5 text-xs font-semibold text-[#57534E] hover:bg-white hover:border-[#0F3E36] transition"
          >
            <Plus className="h-3 w-3" /> নতুন হিসাব
          </button>
        </div>
      </div>

      {/* Action Toolbar & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-white p-3 sm:px-4">
        {/* Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleAddRowTop}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition"
          >
            <Plus className="h-3.5 w-3.5" /> নতুন এন্ট্রি
          </button>
          <button
            type="button"
            onClick={onPrintSheetA4}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-white transition active:scale-95 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5 text-[#0F3E36]" /> প্রিন্ট (A4)
          </button>
          <button
            type="button"
            onClick={onPrintSheetThermal}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#0F3E36] bg-[#0F3E36] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#0A2B25] transition active:scale-95 shadow-2xs"
          >
            <Printer className="h-3.5 w-3.5" /> থার্মাল
          </button>
          <button
            type="button"
            onClick={onPrintReceiptA4}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#991B1B] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#7F1D1D] active:scale-95 transition"
          >
            <Receipt className="h-3.5 w-3.5" /> রশিদ (A4)
          </button>
          <button
            type="button"
            onClick={onPrintReceiptThermal}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition"
          >
            <Receipt className="h-3.5 w-3.5" /> থার্মাল রশিদ
          </button>
          <button
            type="button"
            onClick={onMarkAccountPaid}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#C28B1E] px-3.5 py-1.5 text-xs font-bold text-[#1C1917] shadow-xs hover:bg-[#D4A33B] active:scale-95 transition"
            title="বর্তমান বকেয়া পরিশোধ রেকর্ড করুন"
          >
            <CheckCircle className="h-3.5 w-3.5 text-emerald-950" /> বাকি পরিশোধ
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#1C1917] focus:bg-white focus:outline-none"
          >
            <option value="">সব তারিখ</option>
            {uniqueDates.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="absolute left-2.5 top-2 h-3 w-3 text-[#78716C]" />
            <input
              type="text"
              value={keywordFilter}
              onChange={(e) => setKeywordFilter(e.target.value)}
              placeholder="বিষয় বা মন্তব্য..."
              className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] py-1 pl-8 pr-2.5 text-xs text-[#1C1917] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-2.5 py-1.5 text-xs font-medium text-[#1C1917] focus:bg-white focus:outline-none"
              title="ক্যাটাগরি অনুযায়ী ফিল্টার করুন"
            >
              <option value="">সব ক্যাটাগরি</option>
              <option value="__UNASSIGNED__">ক্যাটাগরি ছাড়া</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setShowCategoryManager(true)}
              title="ক্যাটাগরি তালিকা পরিচালনা করুন"
              className="inline-flex items-center gap-1 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-[#57534E] hover:bg-white hover:text-[#0F3E36] transition shadow-2xs"
            >
              <Tag className="h-3 w-3 text-[#0F3E36]" />
              <span className="hidden sm:inline">ক্যাটাগরি তালিকা</span>
            </button>
          </div>

          {(dateFilter || keywordFilter || categoryFilter) && (
            <button
              type="button"
              onClick={() => {
                setDateFilter('');
                setKeywordFilter('');
                setCategoryFilter('');
              }}
              className="rounded-lg px-2 py-1 text-xs font-semibold text-[#991B1B] hover:bg-neutral-100"
            >
              ✕ ফিল্টার মুছুন
            </button>
          )}
        </div>
      </div>

      {/* Ledger Spreadsheet Table */}
      <div className="flex-1 overflow-x-auto min-h-[340px]">
        <table ref={tableRef} className="w-full border-collapse text-xs sm:text-sm">
          <thead>
            <tr className="border-b border-[#E6DFD3] bg-[#FAF8F5] text-[#57534E] text-left select-none">
              <th className="py-2.5 px-3 text-center w-12 font-bold">নং</th>
              <th className="py-2.5 px-3 w-28 font-bold">তারিখ</th>
              <th className="py-2.5 px-3 font-bold">বিষয়</th>
              <th className="py-2.5 px-3 w-32 font-bold">ক্যাটাগরি</th>
              <th className="py-2.5 px-3 text-right w-24 font-bold">মূল্য</th>
              <th className="py-2.5 px-3 text-right w-24 font-bold text-emerald-800">নগদ</th>
              <th className="py-2.5 px-3 text-right w-24 font-bold text-[#991B1B]">বাকি</th>
              <th className="py-2.5 px-3 font-bold">মন্তব্য</th>
              <th className="py-2.5 px-2 text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F0EAE1]">
            {visibleIndices.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-16 text-center text-[#78716C]">
                  কোনো লেনদেন এন্ট্রি নেই
                </td>
              </tr>
            ) : (
              visibleIndices.map((origIdx) => {
                const row = account.rows[origIdx];
                const d = due(row);
                const sl = serialMap.get(origIdx) || '';
                const rowCats = Array.from(
                  new Set([...categories, ...(row.category ? [row.category] : [])])
                );

                return (
                  <tr
                    key={origIdx}
                    className="hover:bg-[#FAF8F5] focus-within:bg-[#FEFCE8]/60 transition-colors group"
                  >
                    <td className="py-1 px-3 text-center font-mono-num font-semibold text-[#78716C] select-none">
                      {sl}
                    </td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.date}
                        placeholder="২৩/০৭/২০২৬"
                        onChange={(e) => handleCellChange(origIdx, 'date', e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[#1C1917] focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.subject}
                        placeholder="যেমনঃ চাল ২৫ কেজি / মালামাল"
                        onChange={(e) => handleCellChange(origIdx, 'subject', e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[#1C1917] font-medium focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="p-0">
                      <select
                        value={row.category || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '__ADD_NEW__') {
                            const customCat = prompt(
                              'নতুন ক্যাটাগরির নাম লিখুন (যেমনঃ দোকান ভাড়া, কাঁচামাল, বিদ্যুৎ বিল):'
                            );
                            if (customCat && customCat.trim()) {
                              onAddCategory(customCat.trim());
                              handleCellChange(origIdx, 'category', customCat.trim());
                            }
                          } else {
                            handleCellChange(origIdx, 'category', val);
                          }
                        }}
                        className={`w-full bg-transparent px-2.5 py-2 text-xs truncate transition-colors focus:bg-white focus:outline-none cursor-pointer ${
                          row.category ? 'font-bold text-[#0F3E36]' : 'text-[#A8A29E]'
                        }`}
                        title={row.category || 'ক্যাটাগরি নির্বাচন করুন'}
                      >
                        <option value="">— ক্যাটাগরি —</option>
                        {rowCats.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                        <option value="__ADD_NEW__">+ নতুন ক্যাটাগরি...</option>
                      </select>
                    </td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.price}
                        placeholder="0"
                        onChange={(e) => handleCellChange(origIdx, 'price', e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-right font-mono-num text-xs sm:text-sm font-semibold text-[#1C1917] focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.cash}
                        placeholder="0"
                        onChange={(e) => handleCellChange(origIdx, 'cash', e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-right font-mono-num text-xs sm:text-sm font-semibold text-emerald-700 focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="py-2 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                      {d !== '' ? `৳${fmt(d)}` : '—'}
                    </td>
                    <td className="p-0">
                      <input
                        type="text"
                        value={row.comment}
                        placeholder=""
                        onChange={(e) => handleCellChange(origIdx, 'comment', e.target.value)}
                        className="w-full bg-transparent px-3 py-2 text-xs sm:text-sm text-[#57534E] focus:bg-white focus:outline-none"
                      />
                    </td>
                    <td className="py-1 px-2 text-center">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          title="নিচে নতুন সারি যোগ করুন"
                          onClick={() => handleAddRowBelow(origIdx)}
                          className="p-1 rounded text-[#0F3E36] hover:bg-[#0F3E36]/10"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="সারি মুছে ফেলুন"
                          onClick={() => handleDeleteRow(origIdx)}
                          className="p-1 rounded text-[#991B1B] hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-[#E6DFD3] bg-[#FAF8F5] font-bold">
              <td colSpan={4} className="py-3 px-4 font-serif-bn text-sm text-[#0F3E36]">
                সর্বমোট (তালিকার) —
              </td>
              <td className="py-3 px-3 text-right font-mono-num text-[#1C1917]">
                ৳{fmt(totalPrice)}
              </td>
              <td className="py-3 px-3 text-right font-mono-num text-emerald-700">
                ৳{fmt(totalCash)}
              </td>
              <td className="py-3 px-3 text-right font-mono-num text-[#991B1B]">
                ৳{fmt(totalDue)}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Footer Instructions */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#F0EAE1] bg-[#FAF8F5] px-4 py-3 text-xs text-[#78716C]">
        <button
          type="button"
          onClick={handleAddRowTop}
          className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-1.5 font-bold text-white hover:bg-[#0A2B25] transition shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" /> নতুন সারি যোগ করুন
        </button>
        <p className="italic">
          * সংখ্যার ঘরে বাংলা বা ইংরেজি সংখ্যা লিখলেই সাথে সাথে স্বয়ংক্রিয়ভাবে সঠিক যোগ-বিয়োগ ও হিসাব সম্পন্ন হয়।
        </p>
      </div>

      {/* Category Manager Modal */}
      {showCategoryManager && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl border border-[#E6DFD3]">
            <div className="flex items-center justify-between pb-3 border-b border-[#F0EAE1]">
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0F3E36]/10 text-[#0F3E36]">
                  <Tag className="h-4 w-4" />
                </div>
                <h3 className="font-serif-bn text-lg font-bold text-[#1C1917]">
                  লেনদেন ক্যাটাগরি তালিকা
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <p className="text-xs text-[#78716C] mt-2 mb-4">
              আপনার ব্যবসার লেনদেন সহজে ভাগ করতে ক্যাটাগরি যোগ করুন বা সরান।
            </p>

            {/* Add new category form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const trimmed = newCatInput.trim();
                if (trimmed) {
                  onAddCategory(trimmed);
                  setNewCatInput('');
                }
              }}
              className="flex items-center gap-2 mb-4"
            >
              <input
                type="text"
                value={newCatInput}
                onChange={(e) => setNewCatInput(e.target.value)}
                placeholder="নতুন ক্যাটাগরি (যেমনঃ বিদ্যুৎ বিল)..."
                className="flex-1 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-2 text-xs text-[#1C1917] focus:bg-white focus:outline-none"
              />
              <button
                type="submit"
                disabled={!newCatInput.trim()}
                className="inline-flex items-center gap-1 rounded-xl bg-[#0F3E36] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] disabled:opacity-40 transition"
              >
                <Plus className="h-3.5 w-3.5" /> যোগ করুন
              </button>
            </form>

            {/* Suggestions */}
            <div className="mb-4">
              <span className="text-[11px] font-semibold text-[#78716C] block mb-1.5">
                জনপ্রিয় পরামর্শঃ
              </span>
              <div className="flex flex-wrap gap-1.5">
                {['দোকান ভাড়া', 'কাঁচামাল', 'বিদ্যুৎ বিল', 'স্টেশনারি', 'যাতায়াত খরচ', 'চা/নাস্তা', 'বিজ্ঞাপন']
                  .filter((s) => !categories.includes(s))
                  .map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => onAddCategory(s)}
                      className="rounded-lg border border-[#E6DFD3] bg-[#FAF8F5] px-2 py-1 text-[11px] font-medium text-[#57534E] hover:border-[#0F3E36] hover:text-[#0F3E36] hover:bg-white transition"
                    >
                      + {s}
                    </button>
                  ))}
              </div>
            </div>

            {/* Category list */}
            <div className="max-h-60 overflow-y-auto space-y-1.5 border-t border-[#F0EAE1] pt-3">
              <span className="text-xs font-bold text-[#1C1917] block mb-2">
                বিদ্যমান ক্যাটাগরি ({toBnDigits(categories.length)} টি):
              </span>
              {categories.map((cat) => {
                // Count usage in current account
                const usageCount = account.rows.filter((r) => (r.category || '').trim() === cat).length;
                return (
                  <div
                    key={cat}
                    className="flex items-center justify-between rounded-xl bg-[#FAF8F5] border border-[#F0EAE1] px-3 py-2 text-xs text-[#1C1917]"
                  >
                    <div className="flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-[#0F3E36]" />
                      <span className="font-semibold">{cat}</span>
                      {usageCount > 0 && (
                        <span className="text-[10px] text-[#78716C] bg-white border border-[#E6DFD3] rounded-md px-1.5 py-0.5">
                          {toBnDigits(usageCount)} টি এন্ট্রি
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`"${cat}" ক্যাটাগরি তালিকা থেকে মুছে ফেলতে চান?`)) {
                          onDeleteCategory(cat);
                        }
                      }}
                      title="ক্যাটাগরি মুছুন"
                      className="text-neutral-400 hover:text-[#991B1B] p-1 rounded hover:bg-red-50 transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-[#F0EAE1] flex justify-end">
              <button
                type="button"
                onClick={() => setShowCategoryManager(false)}
                className="rounded-xl bg-[#0F3E36] px-4 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] transition"
              >
                সম্পন্ন
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
