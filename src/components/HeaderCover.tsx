import React, { useState } from 'react';
import {
  Bell,
  BookOpen,
  Download,
  FileSpreadsheet,
  FileText,
  HelpCircle,
  Home,
  Lock,
  Printer,
  Search,
  TrendingUp,
  Upload,
  Store,
  ChevronDown,
  Calendar,
  X,
  Smartphone,
  ShieldCheck,
} from 'lucide-react';
import { Sheet, ShopInfo, ViewSection, NotifSettings } from '../types';
import { fmt, toBnDigits } from '../utils/bengali';

interface HeaderCoverProps {
  sheets: Sheet[];
  shopInfo: ShopInfo;
  onUpdateShopInfo: (info: ShopInfo) => void;
  autosaveStatus: { text: string; type: 'saved' | 'saving' | 'error' | '' };
  lastBackupDays: number | null;
  currentSection: ViewSection;
  onSelectSection: (section: ViewSection) => void;
  onExportExcel: () => void;
  onImportExcelClick: () => void;
  onBackupJson: () => void;
  onRestoreJsonClick: () => void;
  onManagePin: () => void;
  hasPin: boolean;
  onPrintSummary: () => void;
  onPrintAllDetail: () => void;
  periodQuery: string;
  onPeriodQueryChange: (q: string) => void;
  notifItems: Array<{
    sIdx: number;
    aIdx: number;
    customerName: string;
    accountName: string;
    multi: boolean;
    due: number;
    daysSince: number | null;
    isHigh: boolean;
    isOld: boolean;
  }>;
  notifSettings: NotifSettings;
  onUpdateNotifSettings: (settings: NotifSettings) => void;
  onSelectCustomerAccount: (sIdx: number, aIdx: number) => void;
}

export const HeaderCover: React.FC<HeaderCoverProps> = ({
  sheets,
  shopInfo,
  onUpdateShopInfo,
  autosaveStatus,
  lastBackupDays,
  currentSection,
  onSelectSection,
  onExportExcel,
  onImportExcelClick,
  onBackupJson,
  onRestoreJsonClick,
  onManagePin,
  hasPin,
  onPrintSummary,
  onPrintAllDetail,
  periodQuery,
  onPeriodQueryChange,
  notifItems,
  notifSettings,
  onUpdateNotifSettings,
  onSelectCustomerAccount,
}) => {
  const [showNotif, setShowNotif] = useState(false);
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  const [isEditingShop, setIsEditingShop] = useState(false);

  // Grand totals
  let grandPrice = 0;
  let grandCash = 0;
  let grandDue = 0;

  sheets.forEach((sheet) => {
    sheet.accounts.forEach((acc) => {
      acc.rows.forEach((row) => {
        const p = parseFloat(row.price) || 0;
        const c = parseFloat(row.cash) || 0;
        grandPrice += p;
        grandCash += c;
        const pStr = row.price.trim();
        const cStr = row.cash.trim();
        if (pStr !== '' || cStr !== '') {
          grandDue += p - c;
        }
      });
    });
  });

  return (
    <header className="mb-6 space-y-3">
      {/* Top Navbar */}
      <div className="rounded-2xl border border-[#E6DFD3] bg-white p-3.5 sm:px-6 sm:py-3.5 shadow-xs flex flex-wrap items-center justify-between gap-4">
        {/* Brand Lockup */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#0F3E36] to-[#0A2B25] text-white shadow-sm ring-1 ring-black/5">
            <span className="text-xl">📒</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-serif-bn text-xl font-bold tracking-tight text-[#1C1917]">
                হিসাবের খাতা
              </h1>
              <span className="hidden sm:inline-flex rounded-full bg-[#0F3E36]/10 px-2.5 py-0.5 text-[10px] font-bold text-[#0F3E36]">
                ডিজিটাল লেজার
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-[#78716C]">
              <span>{shopInfo.name || 'দোকানের নাম নির্ধারণ করুন'}</span>
              <button
                type="button"
                onClick={() => setIsEditingShop(!isEditingShop)}
                className="text-[#C28B1E] hover:underline font-medium text-[11px]"
              >
                {isEditingShop ? 'সম্পাদনা বন্ধ' : 'বদলান'}
              </button>
            </div>
          </div>
        </div>

        {/* Central Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-[#F3EFE6] p-1 text-xs font-semibold overflow-x-auto max-w-full">
          <button
            type="button"
            onClick={() => onSelectSection('dashboard')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap ${
              currentSection === 'dashboard'
                ? 'bg-white text-[#0F3E36] shadow-xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Home className="h-3.5 w-3.5" /> ড্যাশবোর্ড
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('ledger')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap ${
              currentSection === 'ledger'
                ? 'bg-white text-[#0F3E36] shadow-xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <FileSpreadsheet className="h-3.5 w-3.5" /> খাতা (লেজার)
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('invoice')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap ${
              currentSection === 'invoice'
                ? 'bg-white text-[#0F3E36] shadow-xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <FileText className="h-3.5 w-3.5" /> ইনভয়েস
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('report')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap ${
              currentSection === 'report'
                ? 'bg-white text-[#0F3E36] shadow-xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <TrendingUp className="h-3.5 w-3.5" /> রিপোর্ট
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('notebook')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap ${
              currentSection === 'notebook'
                ? 'bg-white text-[#0F3E36] shadow-xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" /> নোট বুক
          </button>
          <button
            type="button"
            onClick={() => onSelectSection('globalSearch')}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 transition-all whitespace-nowrap ${
              currentSection === 'globalSearch'
                ? 'bg-white text-[#0F3E36] shadow-xs font-bold'
                : 'text-[#57534E] hover:text-[#1C1917]'
            }`}
          >
            <Search className="h-3.5 w-3.5" /> অনুসন্ধান
          </button>
        </nav>

        {/* Right Utility Toolbar */}
        <div className="flex items-center gap-2 relative">
          {/* Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowNotif(!showNotif)}
              className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6DFD3] bg-[#F8F6F0] text-[#57534E] transition hover:bg-white hover:text-[#1C1917]"
              title="বাকির নোটিফিকেশন"
            >
              <Bell className="h-4 w-4" />
              {notifItems.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#991B1B] px-1 text-[10px] font-bold text-white shadow-xs">
                  {toBnDigits(notifItems.length > 99 ? 99 : notifItems.length)}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {showNotif && (
              <div className="absolute right-0 top-11 z-50 w-80 sm:w-96 rounded-2xl border border-[#E6DFD3] bg-white text-[#1C1917] shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between border-b border-[#E6DFD3] bg-[#FAF8F5] px-4 py-3">
                  <h3 className="font-serif-bn font-bold text-sm text-[#991B1B] flex items-center gap-2">
                    <Bell className="h-4 w-4" /> বকেয়া বাকির সতর্কতা
                  </h3>
                  <button
                    type="button"
                    onClick={() => setShowNotif(false)}
                    className="rounded p-1 text-[#78716C] hover:bg-black/5"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="border-b border-[#E6DFD3] bg-[#F8F6F0] p-3 text-xs text-[#57534E] space-y-2">
                  <label className="flex items-center justify-between gap-2">
                    <span>বেশি বকেয়া ধরা হবেঃ ৳</span>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      value={notifSettings.amountThreshold}
                      onChange={(e) =>
                        onUpdateNotifSettings({
                          ...notifSettings,
                          amountThreshold: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="w-24 rounded-lg border border-[#E6DFD3] bg-white px-2 py-1 text-right font-mono-num font-bold text-[#1C1917]"
                    />
                    <span>টাকার বেশি</span>
                  </label>
                  <label className="flex items-center justify-between gap-2">
                    <span>দীর্ঘদিন বকেয়া ধরা হবেঃ</span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={notifSettings.daysThreshold}
                      onChange={(e) =>
                        onUpdateNotifSettings({
                          ...notifSettings,
                          daysThreshold: parseInt(e.target.value, 10) || 1,
                        })
                      }
                      className="w-24 rounded-lg border border-[#E6DFD3] bg-white px-2 py-1 text-right font-mono-num font-bold text-[#1C1917]"
                    />
                    <span>দিনের বেশি</span>
                  </label>
                </div>

                <div className="max-h-72 overflow-y-auto divide-y divide-[#F0EAE1]">
                  {notifItems.length === 0 ? (
                    <div className="py-8 text-center text-xs text-[#78716C]">
                      কোনো অতিরিক্ত বা দীর্ঘদিন বকেয়া হিসাব নেই
                    </div>
                  ) : (
                    notifItems.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => {
                          onSelectCustomerAccount(item.sIdx, item.aIdx);
                          setShowNotif(false);
                        }}
                        className="flex items-center justify-between gap-3 p-3 transition hover:bg-[#FAF8F5] cursor-pointer"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-xs font-bold text-[#1C1917]">
                            {item.customerName}
                            {item.multi && (
                              <span className="font-normal text-[#78716C]"> ({item.accountName})</span>
                            )}
                          </div>
                          <div className="text-[11px] text-[#78716C] mt-0.5">
                            {item.daysSince != null
                              ? `শেষ লেনদেন থেকে ${toBnDigits(item.daysSince)} দিন`
                              : 'তারিখ নেই'}
                          </div>
                          <div className="mt-1 flex gap-1.5 flex-wrap">
                            {item.isHigh && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-[#991B1B]">
                                বেশি বকেয়া
                              </span>
                            )}
                            {item.isOld && (
                              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-[#B45309]">
                                অনেক দিন
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="font-mono-num text-sm font-bold text-[#991B1B] whitespace-nowrap">
                          ৳{fmt(item.due)}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Backup & Excel Menu */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowBackupMenu(!showBackupMenu)}
              className="flex items-center gap-1.5 rounded-xl border border-[#E6DFD3] bg-[#F8F6F0] px-3 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-white transition shadow-2xs"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-[#0F3E36]" />
              <span className="hidden sm:inline">ফাইল ও ব্যাকআপ</span>
              <ChevronDown className="h-3 w-3 text-[#78716C]" />
            </button>

            {showBackupMenu && (
              <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-[#E6DFD3] bg-white p-1.5 shadow-xl text-xs space-y-1 animate-in fade-in slide-in-from-top-1 duration-150">
                <button
                  type="button"
                  onClick={() => {
                    onExportExcel();
                    setShowBackupMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-semibold text-[#1C1917] hover:bg-[#F8F6F0]"
                >
                  <Download className="h-3.5 w-3.5 text-[#C28B1E]" /> ⇩ এক্সেল হিসেবে সেভ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onImportExcelClick();
                    setShowBackupMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium text-[#1C1917] hover:bg-[#F8F6F0]"
                >
                  <Upload className="h-3.5 w-3.5 text-[#0F3E36]" /> ⇪ এক্সেল ফাইল ইমপোর্ট
                </button>
                <div className="my-1 border-t border-[#F0EAE1]" />
                <button
                  type="button"
                  onClick={() => {
                    onBackupJson();
                    setShowBackupMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium text-[#1C1917] hover:bg-[#F8F6F0]"
                >
                  <Download className="h-3.5 w-3.5 text-[#15803D]" /> ⇩ সম্পূর্ণ ব্যাকআপ (JSON)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onRestoreJsonClick();
                    setShowBackupMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium text-[#1C1917] hover:bg-[#F8F6F0]"
                >
                  <Upload className="h-3.5 w-3.5 text-[#78716C]" /> ⇪ ব্যাকআপ থেকে রিস্টোর
                </button>
                <div className="my-1 border-t border-[#F0EAE1]" />
                <button
                  type="button"
                  onClick={() => {
                    onManagePin();
                    setShowBackupMenu(false);
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left font-medium text-[#1C1917] hover:bg-[#F8F6F0]"
                >
                  <Lock className="h-3.5 w-3.5 text-[#991B1B]" /> {hasPin ? 'পিন কোড পরিবর্তন/বন্ধ' : 'পিন লক সেট করুন'}
                </button>
              </div>
            )}
          </div>

          {/* Guide Icon Button */}
          <button
            type="button"
            onClick={() => onSelectSection(currentSection === 'guide' ? 'ledger' : 'guide')}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#E6DFD3] bg-[#F8F6F0] text-[#57534E] hover:bg-white hover:text-[#1C1917] transition"
            title="গাইড ও কিবোর্ড শর্টকাট"
          >
            <HelpCircle className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Editable Shop Info Banner (collapsible) */}
      {isEditingShop && (
        <div className="rounded-2xl border border-[#E6DFD3] bg-white p-4 shadow-xs animate-in fade-in duration-150">
          <div className="flex items-center justify-between pb-2 mb-3 border-b border-[#F0EAE1]">
            <h4 className="text-xs font-bold text-[#1C1917] flex items-center gap-1.5">
              <Store className="h-4 w-4 text-[#C28B1E]" /> দোকান ও প্রতিষ্ঠানের তথ্য (রশিদ ও ইনভয়েসে প্রিন্ট হবে)
            </h4>
            <button
              type="button"
              onClick={() => setIsEditingShop(false)}
              className="text-xs font-semibold text-[#78716C] hover:text-[#1C1917]"
            >
              সম্পন্ন ✓
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#78716C] mb-1">
                দোকান বা ব্যবসা প্রতিষ্ঠানের নামঃ
              </label>
              <input
                type="text"
                value={shopInfo.name}
                onChange={(e) => onUpdateShopInfo({ ...shopInfo, name: e.target.value })}
                placeholder="যেমনঃ মেসার্স রহিম ট্রেডার্স"
                className="w-full rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#78716C] mb-1">
                প্রতিষ্ঠানের ঠিকানাঃ
              </label>
              <input
                type="text"
                value={shopInfo.address}
                onChange={(e) => onUpdateShopInfo({ ...shopInfo, address: e.target.value })}
                placeholder="যেমনঃ চকবাজার, ঢাকা"
                className="w-full rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#78716C] mb-1">
                দোকানের মোবাইল/ফোন নম্বরঃ
              </label>
              <input
                type="text"
                value={shopInfo.phone}
                onChange={(e) => onUpdateShopInfo({ ...shopInfo, phone: e.target.value })}
                placeholder="যেমনঃ ০১৭১১-XXXXXX"
                className="w-full rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-xs text-[#1C1917] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
              />
            </div>
          </div>
        </div>
      )}

      {/* High-Impact Executive Metric Strip & Time Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {/* KPI Cards (8 Columns) */}
        <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Total Price */}
          <div className="rounded-2xl border border-[#E6DFD3] bg-white p-4 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
              <span>মোট বিক্রি / মূল্য</span>
              <span className="text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 text-[10px] font-bold">
                বিক্রি
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono-num">
              <span className="text-xs font-semibold text-[#78716C]">৳</span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#1C1917]">
                {fmt(grandPrice)}
              </span>
            </div>
          </div>

          {/* Total Cash */}
          <div className="rounded-2xl border border-[#E6DFD3] bg-white p-4 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between text-xs text-[#78716C] font-semibold">
              <span>মোট নগদ আদায়</span>
              <span className="text-emerald-700 bg-emerald-50 rounded-full px-2 py-0.5 text-[10px] font-bold">
                ক্যাশ
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono-num">
              <span className="text-xs font-semibold text-[#15803D]">৳</span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#15803D]">
                {fmt(grandCash)}
              </span>
            </div>
          </div>

          {/* Total Outstanding Due */}
          <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-[#FEF2F2] to-white p-4 shadow-xs transition hover:shadow-sm">
            <div className="flex items-center justify-between text-xs font-bold text-[#991B1B]">
              <span>সর্বমোট বকেয়া বাকি</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] text-[#991B1B]">
                বকেয়া
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1 font-mono-num">
              <span className="text-xs font-semibold text-[#991B1B]">৳</span>
              <span className="text-xl sm:text-2xl font-bold tracking-tight text-[#991B1B]">
                {fmt(grandDue)}
              </span>
            </div>
          </div>
        </div>

        {/* Period Filter & Print Helper (4 Columns) */}
        <div className="lg:col-span-4 rounded-2xl border border-[#E6DFD3] bg-white p-3.5 shadow-xs flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#57534E] flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-[#C28B1E]" /> সময়কাল ফিল্টার / প্রিন্ট
            </span>
            <div className="flex items-center gap-1 text-[11px]">
              <button
                type="button"
                onClick={onPrintSummary}
                className="text-[#0F3E36] hover:underline font-semibold"
                title="সারসংক্ষেপ প্রিন্ট করুন"
              >
                সারসংক্ষেপ
              </button>
              <span className="text-neutral-300">·</span>
              <button
                type="button"
                onClick={onPrintAllDetail}
                className="text-[#0F3E36] hover:underline font-semibold"
                title="বিস্তারিত প্রিন্ট করুন"
              >
                বিস্তারিত
              </button>
            </div>
          </div>

          <div className="relative">
            <input
              type="text"
              value={periodQuery}
              onChange={(e) => onPeriodQueryChange(e.target.value)}
              placeholder="তারিখ (২৩/০৭/২০২৬), মাস (জুলাই), বছর (২০২৬)"
              className="w-full rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] py-2 pl-3 pr-8 text-xs text-[#1C1917] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
            />
            {periodQuery && (
              <button
                type="button"
                onClick={() => onPeriodQueryChange('')}
                className="absolute right-2 top-2 text-[#78716C] hover:text-[#1C1917]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Small Status Indicator in footer of strip */}
          <div className="flex items-center justify-between text-[11px] text-[#78716C] pt-1 border-t border-[#F0EAE1]">
            <span className="flex items-center gap-1 truncate max-w-[200px]">
              <span
                className={`h-1.5 w-1.5 rounded-full ${
                  autosaveStatus.type === 'saved'
                    ? 'bg-emerald-600'
                    : autosaveStatus.type === 'saving'
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-red-500'
                }`}
              />
              {autosaveStatus.text}
            </span>
            {lastBackupDays !== null ? (
              <span>{lastBackupDays === 0 ? 'আজ ব্যাকআপ নেওয়া' : `${toBnDigits(lastBackupDays)} দিন আগে`}</span>
            ) : (
              <span className="text-amber-700">ব্যাকআপ নেই</span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
