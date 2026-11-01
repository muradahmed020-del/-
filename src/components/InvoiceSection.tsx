import React, { useState } from 'react';
import {
  FileText,
  Plus,
  Printer,
  Trash2,
  Edit3,
  Search,
  Check,
  Calendar,
  User,
  DollarSign,
  Receipt,
  FileCheck,
} from 'lucide-react';
import { Sheet, Invoice, InvoiceDraft, InvoiceItem } from '../types';
import { fmt, toBnDigits, toEnDigits, todayDMY, formatInvoiceNo, MONTH_NAMES } from '../utils/bengali';

interface InvoiceSectionProps {
  sheets: Sheet[];
  invoices: Invoice[];
  onClose: () => void;
  onSaveInvoice: (invoice: Invoice, addToLedger: boolean) => void;
  onDeleteInvoice: (no: number) => void;
  onPrintA4: (invoice: Invoice) => void;
  onPrintThermal: (invoice: Invoice) => void;
}

export const InvoiceSection: React.FC<InvoiceSectionProps> = ({
  sheets,
  invoices,
  onClose,
  onSaveInvoice,
  onDeleteInvoice,
  onPrintA4,
  onPrintThermal,
}) => {
  const [tab, setTab] = useState<'new' | 'list' | 'report'>('new');
  const [listSearch, setListSearch] = useState('');

  const createEmptyDraft = (): InvoiceDraft => ({
    customerName: '',
    date: todayDMY(),
    items: [
      { subject: '', qty: '1', price: '', comment: '' },
      { subject: '', qty: '1', price: '', comment: '' },
      { subject: '', qty: '1', price: '', comment: '' },
    ],
    discount: '',
    vatPercent: '',
    paidNow: '',
    note: '',
    addToLedger: true,
    editingNo: null,
  });

  const [draft, setDraft] = useState<InvoiceDraft>(createEmptyDraft());

  // Customer previous due
  const customerPreviousDue = (() => {
    const name = draft.customerName.trim().toLowerCase();
    if (!name) return 0;
    const found = sheets.find((s) => s.name.trim().toLowerCase() === name);
    if (!found) return 0;
    let dTotal = 0;
    found.accounts.forEach((acc) => {
      acc.rows.forEach((r) => {
        const p = parseFloat(toEnDigits(r.price)) || 0;
        const c = parseFloat(toEnDigits(r.cash)) || 0;
        if (r.price || r.cash) dTotal += p - c;
      });
    });
    return dTotal;
  })();

  // Calculations for current draft
  let subtotal = 0;
  draft.items.forEach((it) => {
    const q = parseFloat(toEnDigits(it.qty)) || 1;
    const p = parseFloat(toEnDigits(it.price)) || 0;
    subtotal += q * p;
  });

  const discountVal = parseFloat(toEnDigits(draft.discount)) || 0;
  const afterDiscount = Math.max(0, subtotal - discountVal);
  const vatPercentVal = parseFloat(toEnDigits(draft.vatPercent)) || 0;
  const vatAmount = Math.round((afterDiscount * vatPercentVal) / 100);
  const grandTotal = afterDiscount + vatAmount;
  const paidNowVal = parseFloat(toEnDigits(draft.paidNow)) || 0;
  const dueVal = grandTotal - paidNowVal;
  const totalCombinedDue = customerPreviousDue + dueVal;

  const handleItemChange = (idx: number, field: keyof InvoiceItem, val: string) => {
    const newItems = [...draft.items];
    if (field === 'qty' || field === 'price') {
      newItems[idx] = { ...newItems[idx], [field]: toEnDigits(val) };
    } else {
      newItems[idx] = { ...newItems[idx], [field]: val };
    }
    setDraft({ ...draft, items: newItems });
  };

  const handleAddItem = () => {
    setDraft({
      ...draft,
      items: [...draft.items, { subject: '', qty: '1', price: '', comment: '' }],
    });
  };

  const handleDeleteItem = (idx: number) => {
    if (draft.items.length <= 1) {
      setDraft({ ...draft, items: [{ subject: '', qty: '1', price: '', comment: '' }] });
      return;
    }
    setDraft({ ...draft, items: draft.items.filter((_, i) => i !== idx) });
  };

  const handleSave = (printMode: 'none' | 'a4' | 'thermal') => {
    const name = draft.customerName.trim();
    if (!name) {
      alert('অনুগ্রহ করে কাস্টমারের নাম লিখুন।');
      return;
    }

    const validItems = draft.items
      .map((it) => ({
        subject: it.subject.trim(),
        qty: it.qty || '1',
        price: it.price || '',
        comment: it.comment.trim(),
      }))
      .filter((it) => it.subject || it.price);

    if (validItems.length === 0) {
      alert('অন্তত একটি পণ্যের নাম ও মূল্য লিখুন।');
      return;
    }

    const nextNo = draft.editingNo || (invoices.length > 0 ? Math.max(...invoices.map((i) => i.no)) + 1 : 1);

    const invoiceObj: Invoice = {
      no: nextNo,
      customerName: name,
      date: draft.date || todayDMY(),
      items: validItems,
      discount: discountVal,
      vatPercent: vatPercentVal,
      vatAmount,
      paidNow: paidNowVal,
      note: draft.note.trim(),
      subtotal,
      grandTotal,
      due: dueVal,
      previousDue: customerPreviousDue,
      totalDueAll: totalCombinedDue,
      createdAt: Date.now(),
      editedAt: draft.editingNo ? Date.now() : undefined,
    };

    onSaveInvoice(invoiceObj, draft.addToLedger);

    if (printMode === 'a4') {
      onPrintA4(invoiceObj);
    } else if (printMode === 'thermal') {
      onPrintThermal(invoiceObj);
    }

    setDraft(createEmptyDraft());
    setTab('list');
  };

  const handleEditInvoice = (inv: Invoice) => {
    setDraft({
      customerName: inv.customerName,
      date: inv.date,
      items: inv.items.map((it) => ({ ...it })),
      discount: inv.discount ? String(inv.discount) : '',
      vatPercent: inv.vatPercent ? String(inv.vatPercent) : '',
      paidNow: inv.paidNow ? String(inv.paidNow) : '',
      note: inv.note,
      addToLedger: false,
      editingNo: inv.no,
    });
    setTab('new');
  };

  // Monthly invoice report
  interface MonthlyReport {
    monthYear: string;
    month: number;
    year: number;
    count: number;
    billed: number;
    received: number;
    dueAmt: number;
  }
  const monthlyMap = new Map<string, MonthlyReport>();
  invoices.forEach((inv) => {
    const d = new Date(inv.createdAt);
    const m = d.getMonth() + 1;
    const y = d.getFullYear();
    const key = `${y}-${m}`;
    if (!monthlyMap.has(key)) {
      monthlyMap.set(key, {
        monthYear: `${MONTH_NAMES[m - 1]} ${toBnDigits(y)}`,
        month: m,
        year: y,
        count: 0,
        billed: 0,
        received: 0,
        dueAmt: 0,
      });
    }
    const r = monthlyMap.get(key)!;
    r.count++;
    r.billed += inv.grandTotal;
    r.received += inv.paidNow;
    r.dueAmt += inv.due;
  });
  const monthlyReports = Array.from(monthlyMap.values()).sort(
    (a, b) => b.year * 100 + b.month - (a.year * 100 + a.month)
  );

  const filteredInvoices = invoices.filter((inv) => {
    if (!listSearch.trim()) return true;
    const q = listSearch.toLowerCase();
    return inv.customerName.toLowerCase().includes(q) || String(inv.no).includes(q) || inv.date.includes(q);
  });

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden mb-6 animate-in fade-in duration-200">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-[#FAF8F5] p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3E36] text-white">
            <FileText className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif-bn text-lg font-bold text-[#1C1917]">
              ইনভয়েস তৈরি ও বিলিং ব্যবস্থা
            </h2>
            <p className="text-xs text-[#78716C]">
              প্রফেশনাল চালান, রশিদ ও বিল তৈরি এবং লেজারের সাথে সংযোগ
            </p>
          </div>
        </div>

        {/* View Mode Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-[#F3EFE6] p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('new')}
            className={`rounded-lg px-3 py-1.5 transition ${
              tab === 'new' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            {draft.editingNo ? `ইনভয়েস #${formatInvoiceNo(draft.editingNo)} এডিট` : 'নতুন ইনভয়েস'}
          </button>
          <button
            type="button"
            onClick={() => setTab('list')}
            className={`rounded-lg px-3 py-1.5 transition ${
              tab === 'list' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            সব ইনভয়েস ({toBnDigits(invoices.length)})
          </button>
          <button
            type="button"
            onClick={() => setTab('report')}
            className={`rounded-lg px-3 py-1.5 transition ${
              tab === 'report' ? 'bg-white text-[#0F3E36] shadow-2xs font-bold' : 'text-[#57534E]'
            }`}
          >
            মাসভিত্তিক রিপোর্ট
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

      {/* Tab 1: New / Edit Invoice */}
      {tab === 'new' && (
        <div className="p-4 sm:p-6 space-y-5">
          {/* Top Form Fields */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 rounded-2xl border border-[#E6DFD3] bg-[#FAF8F5] p-4">
            <div className="sm:col-span-8">
              <label className="block text-xs font-bold text-[#57534E] mb-1.5">
                কাস্টমারের নামঃ
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="customerNameSuggestions"
                  value={draft.customerName}
                  onChange={(e) => setDraft({ ...draft, customerName: e.target.value })}
                  placeholder="কাস্টমারের নাম নির্বাচন করুন বা লিখুন..."
                  className="w-full rounded-xl border border-[#E6DFD3] bg-white px-3.5 py-2 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
                />
                <datalist id="customerNameSuggestions">
                  {sheets.map((s, idx) => (
                    <option key={idx} value={s.name} />
                  ))}
                </datalist>
              </div>

              {customerPreviousDue > 0 && (
                <div className="mt-2 text-xs font-semibold text-[#991B1B] flex items-center gap-1.5">
                  <span>⚠️ এই কাস্টমারের পূর্বের বকেয়া রয়েছেঃ</span>
                  <span className="font-mono-num font-bold">৳{fmt(customerPreviousDue)}</span>
                </div>
              )}
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-[#57534E] mb-1.5">ইনভয়েসের তারিখঃ</label>
              <input
                type="text"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                placeholder="২৩/০৭/২০২৬"
                className="w-full rounded-xl border border-[#E6DFD3] bg-white px-3.5 py-2 text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
              />
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6DFD3] text-left">
                  <th className="py-2.5 px-4 font-bold">পণ্য বা বিষয়</th>
                  <th className="py-2.5 px-3 text-right w-24 font-bold">পরিমাণ</th>
                  <th className="py-2.5 px-3 text-right w-28 font-bold">এককমূল্য (দর)</th>
                  <th className="py-2.5 px-3 text-right w-28 font-bold">মোট টাকা</th>
                  <th className="py-2.5 px-3 font-bold">মন্তব্য</th>
                  <th className="py-2.5 px-2 text-center w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {draft.items.map((it, idx) => {
                  const q = parseFloat(toEnDigits(it.qty)) || 1;
                  const p = parseFloat(toEnDigits(it.price)) || 0;
                  const total = q * p;
                  return (
                    <tr key={idx} className="hover:bg-[#FAF8F5] transition">
                      <td className="p-1.5 px-3">
                        <input
                          type="text"
                          value={it.subject}
                          placeholder="যেমনঃ চিনি ৫০ কেজি"
                          onChange={(e) => handleItemChange(idx, 'subject', e.target.value)}
                          className="w-full rounded-lg bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-[#1C1917] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3E36]"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={it.qty}
                          placeholder="1"
                          onChange={(e) => handleItemChange(idx, 'qty', e.target.value)}
                          className="w-full text-right font-mono-num rounded-lg bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-[#1C1917] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3E36]"
                        />
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={it.price}
                          placeholder="0"
                          onChange={(e) => handleItemChange(idx, 'price', e.target.value)}
                          className="w-full text-right font-mono-num rounded-lg bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-[#1C1917] focus:bg-white focus:outline-none focus:ring-1 focus:ring-[#0F3E36]"
                        />
                      </td>
                      <td className="py-2 px-3 text-right font-mono-num font-bold text-[#1C1917]">
                        ৳{fmt(total)}
                      </td>
                      <td className="p-1.5">
                        <input
                          type="text"
                          value={it.comment}
                          placeholder=""
                          onChange={(e) => handleItemChange(idx, 'comment', e.target.value)}
                          className="w-full rounded-lg bg-transparent px-2.5 py-1.5 text-xs sm:text-sm text-[#57534E] focus:bg-white focus:outline-none"
                        />
                      </td>
                      <td className="p-1.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(idx)}
                          className="text-[#991B1B] p-1 rounded-lg hover:bg-red-50"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={handleAddItem}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition"
          >
            <Plus className="h-3.5 w-3.5" /> + নতুন পণ্য সারি যোগ করুন
          </button>

          {/* Subtotal, Discount, VAT, Grand Total row */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 rounded-2xl border border-[#E6DFD3] bg-[#FAF8F5] p-5 text-xs">
            <div className="lg:col-span-7 space-y-4">
              <div>
                <label className="block font-bold text-[#57534E] mb-1.5">
                  ইনভয়েস নোট বা শর্তাবলীঃ
                </label>
                <textarea
                  value={draft.note}
                  onChange={(e) => setDraft({ ...draft, note: e.target.value })}
                  placeholder="যেমনঃ বিক্রিত মাল ফেরত নেওয়া হয় না / ধন্যবাদান্তে মেসার্স রহিম ট্রেডার্স"
                  rows={3}
                  className="w-full rounded-xl border border-[#E6DFD3] bg-white p-3 text-xs text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer font-semibold text-[#0F3E36]">
                <input
                  type="checkbox"
                  checked={draft.addToLedger}
                  onChange={(e) => setDraft({ ...draft, addToLedger: e.target.checked })}
                  className="rounded border-[#E6DFD3] text-[#0F3E36] h-4 w-4"
                />
                এই ইনভয়েসের তথ্য কাস্টমারের মূল হিসাবের খাতায় স্বয়ংক্রিয়ভাবে যোগ হোক
              </label>
            </div>

            <div className="lg:col-span-5 space-y-2.5 border-t lg:border-t-0 lg:border-l border-[#E6DFD3] pt-4 lg:pt-0 lg:pl-6">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#57534E]">উপমোট (Subtotal):</span>
                <span className="font-mono-num font-bold text-[#1C1917]">৳{fmt(subtotal)}</span>
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-[#57534E]">ছাড় / ডিসকাউন্ট (টাকা):</span>
                <input
                  type="text"
                  value={draft.discount}
                  placeholder="0"
                  onChange={(e) => setDraft({ ...draft, discount: toEnDigits(e.target.value) })}
                  className="w-28 text-right font-mono-num rounded-lg border border-[#E6DFD3] bg-white px-2 py-1 text-xs"
                />
              </div>

              <div className="flex justify-between items-center gap-2">
                <span className="text-[#57534E]">ভ্যাট / ট্যাক্স (%):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={draft.vatPercent}
                    placeholder="0"
                    onChange={(e) => setDraft({ ...draft, vatPercent: toEnDigits(e.target.value) })}
                    className="w-16 text-right font-mono-num rounded-lg border border-[#E6DFD3] bg-white px-2 py-1 text-xs"
                  />
                  <span className="text-[11px] text-[#78716C]">= ৳{fmt(vatAmount)}</span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-2.5 border-t border-[#E6DFD3] font-bold text-sm text-[#1C1917]">
                <span>সর্বমোট বিলঃ</span>
                <span className="font-mono-num text-[#0F3E36] text-base">৳{fmt(grandTotal)}</span>
              </div>

              <div className="flex justify-between items-center gap-2 pt-1">
                <span className="text-[#57534E] font-semibold">নগদ প্রাপ্তি (Paid):</span>
                <input
                  type="text"
                  value={draft.paidNow}
                  placeholder="0"
                  onChange={(e) => setDraft({ ...draft, paidNow: toEnDigits(e.target.value) })}
                  className="w-32 text-right font-mono-num font-bold text-emerald-800 rounded-lg border border-[#E6DFD3] bg-white px-2.5 py-1 text-xs focus:ring-1 focus:ring-emerald-700 focus:outline-none"
                />
              </div>

              <div className="flex justify-between items-center font-bold text-[#991B1B] text-xs pt-1">
                <span>এই চালানের বকেয়া বাকিঃ</span>
                <span className="font-mono-num text-sm">৳{fmt(dueVal)}</span>
              </div>

              {customerPreviousDue > 0 && (
                <div className="flex justify-between items-center pt-2 border-t border-dashed border-[#E6DFD3] text-xs font-bold text-[#991B1B]">
                  <span>গ্রাহকের সর্বমোট বকেয়াঃ</span>
                  <span className="font-mono-num text-sm">৳{fmt(totalCombinedDue)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => handleSave('none')}
              className="rounded-xl bg-[#0F3E36] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition"
            >
              💾 শুধু সেভ করুন
            </button>
            <button
              type="button"
              onClick={() => handleSave('a4')}
              className="rounded-xl bg-[#991B1B] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#7F1D1D] active:scale-95 transition flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> 🖨️ A4 প্রিন্ট ও সেভ
            </button>
            <button
              type="button"
              onClick={() => handleSave('thermal')}
              className="rounded-xl bg-[#0F3E36] px-5 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition flex items-center gap-1.5"
            >
              <Receipt className="h-3.5 w-3.5" /> 🧾 থার্মাল প্রিন্ট ও সেভ
            </button>
            <button
              type="button"
              onClick={() => setDraft(createEmptyDraft())}
              className="rounded-xl border border-[#E6DFD3] bg-white px-4 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F8F6F0] transition"
            >
              ✕ ফাঁকা করুন
            </button>
          </div>
        </div>
      )}

      {/* Tab 2: Invoice List */}
      {tab === 'list' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#78716C]" />
            <input
              type="text"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder="কাস্টমারের নাম বা ইনভয়েস নং..."
              className="w-full rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] py-2 pl-9 pr-3 text-xs text-[#1C1917] focus:bg-white focus:outline-none"
            />
          </div>

          <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6DFD3] text-left">
                  <th className="py-2.5 px-4 font-bold">ইনভয়েস নং</th>
                  <th className="py-2.5 px-3 font-bold">তারিখ</th>
                  <th className="py-2.5 px-3 font-bold">গ্রাহকের নাম</th>
                  <th className="py-2.5 px-3 text-right font-bold">মোট বিল</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-800">নগদ প্রাপ্তি</th>
                  <th className="py-2.5 px-3 text-right font-bold text-[#991B1B]">বকেয়া বাকি</th>
                  <th className="py-2.5 px-3 text-center font-bold">অ্যাকশন</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-[#78716C]">
                      কোনো ইনভয়েস পাওয়া যায়নি
                    </td>
                  </tr>
                ) : (
                  filteredInvoices.map((inv) => (
                    <tr key={inv.no} className="hover:bg-[#FAF8F5] transition">
                      <td className="py-3 px-4 font-mono-num font-bold text-[#0F3E36]">
                        #{formatInvoiceNo(inv.no)}
                      </td>
                      <td className="py-3 px-3 text-[#78716C]">{inv.date}</td>
                      <td className="py-3 px-3 font-bold text-[#1C1917]">{inv.customerName}</td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold text-[#1C1917]">
                        ৳{fmt(inv.grandTotal)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold text-emerald-800">
                        ৳{fmt(inv.paidNow)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                        ৳{fmt(inv.due)}
                      </td>
                      <td className="py-3 px-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            title="সম্পাদনা করুন"
                            onClick={() => handleEditInvoice(inv)}
                            className="p-1 rounded-md text-[#0F3E36] hover:bg-black/5"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="A4 প্রিন্ট"
                            onClick={() => onPrintA4(inv)}
                            className="p-1 rounded-md text-[#C28B1E] hover:bg-black/5"
                          >
                            <Printer className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="৮০mm থার্মাল প্রিন্ট"
                            onClick={() => onPrintThermal(inv)}
                            className="p-1 rounded-md text-[#0F3E36] hover:bg-black/5"
                          >
                            <Receipt className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            title="মুছে ফেলুন"
                            onClick={() => {
                              if (confirm(`ইনভয়েস #${formatInvoiceNo(inv.no)} মুছে ফেলতে চান?`)) {
                                onDeleteInvoice(inv.no);
                              }
                            }}
                            className="p-1 rounded-md text-[#991B1B] hover:bg-red-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Monthly Invoice Report */}
      {tab === 'report' && (
        <div className="p-4 sm:p-6 space-y-4">
          <div className="text-xs text-[#78716C]">
            মাসভিত্তিক বিলিং সারাংশঃ
          </div>
          <div className="overflow-x-auto rounded-2xl border border-[#E6DFD3]">
            <table className="w-full text-xs sm:text-sm border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] text-[#57534E] border-b border-[#E6DFD3] text-left">
                  <th className="py-2.5 px-4 font-bold">মাস</th>
                  <th className="py-2.5 px-3 text-right font-bold">ইনভয়েস সংখ্যা</th>
                  <th className="py-2.5 px-3 text-right font-bold">মোট বিল</th>
                  <th className="py-2.5 px-3 text-right font-bold text-emerald-800">নগদ প্রাপ্তি</th>
                  <th className="py-2.5 px-3 text-right font-bold text-[#991B1B]">মোট বকেয়া</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F0EAE1]">
                {monthlyReports.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-12 text-center text-[#78716C]">
                      এখনো কোনো ইনভয়েস সেভ হয়নি
                    </td>
                  </tr>
                ) : (
                  monthlyReports.map((r, idx) => (
                    <tr key={idx} className="hover:bg-[#FAF8F5]">
                      <td className="py-3 px-4 font-semibold text-[#1C1917]">{r.monthYear}</td>
                      <td className="py-3 px-3 text-right font-mono-num text-[#78716C]">
                        {toBnDigits(r.count)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold text-[#1C1917]">
                        ৳{fmt(r.billed)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-semibold text-emerald-800">
                        ৳{fmt(r.received)}
                      </td>
                      <td className="py-3 px-3 text-right font-mono-num font-bold text-[#991B1B]">
                        ৳{fmt(r.dueAmt)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
