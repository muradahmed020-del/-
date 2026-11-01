import React, { useState, useMemo } from 'react';
import {
  Home,
  Share2,
  CheckCircle,
  TrendingUp,
  Target,
  Edit2,
  Check,
  X,
  Sparkles,
  Clock,
  ArrowRight,
  Flame,
  BarChart3,
  LineChart,
  Calendar,
  Layers,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { Sheet } from '../types';
import { fmt, toBnDigits, toEnDigits, due, parseRowDate, todayBn, MONTH_NAMES } from '../utils/bengali';

interface DashboardViewProps {
  sheets: Sheet[];
  dailyCashTarget: number;
  onUpdateDailyTarget: (newTarget: number) => void;
  onClose: () => void;
  onSelectCustomer: (sIdx: number, aIdx: number) => void;
  onSendDueReminder: (sIdx: number, aIdx: number) => void;
  onMarkAccountPaid: (sIdx: number, aIdx: number) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  sheets,
  dailyCashTarget,
  onUpdateDailyTarget,
  onClose,
  onSelectCustomer,
  onSendDueReminder,
  onMarkAccountPaid,
}) => {
  const now = new Date();
  const curDay = now.getDate();
  const curMonth = now.getMonth() + 1;
  const curYear = now.getFullYear();

  const [isEditingTarget, setIsEditingTarget] = useState(false);
  const [targetInput, setTargetInput] = useState(String(dailyCashTarget || 10000));
  const [trendViewMode, setTrendViewMode] = useState<'weekly' | 'daily'>('weekly');
  const [chartType, setChartType] = useState<'bar' | 'area'>('bar');

  let totalDue = 0;
  let monthPrice = 0;
  let monthCash = 0;
  let todayCash = 0;
  let todaySales = 0;

  // Calculate debtors
  interface DebtorItem {
    sIdx: number;
    aIdx: number;
    customerName: string;
    accountName: string;
    multi: boolean;
    due: number;
    phone: string;
  }
  const debtors: DebtorItem[] = [];

  // Recent transactions
  interface RecentRow {
    sIdx: number;
    aIdx: number;
    customerName: string;
    date: string;
    subject: string;
    price: string;
    cash: string;
    dueAmt: number | '';
    score: number;
  }
  const recentRows: RecentRow[] = [];

  sheets.forEach((sheet, sIdx) => {
    sheet.accounts.forEach((acc, aIdx) => {
      let accDue = 0;
      acc.rows.forEach((r) => {
        const d = due(r);
        if (d !== '') accDue += d;

        const parsed = parseRowDate(r.date);
        const p = parseFloat(toEnDigits(r.price)) || 0;
        const c = parseFloat(toEnDigits(r.cash)) || 0;

        if (parsed && parsed.year === curYear && parsed.month === curMonth) {
          monthPrice += p;
          monthCash += c;

          if (parsed.day === curDay) {
            todayCash += c;
            todaySales += p;
          }
        }

        if (r.subject || r.price || r.cash) {
          const score =
            parsed && parsed.year ? parsed.year * 10000 + (parsed.month || 0) * 100 + (parsed.day || 0) : 0;
          recentRows.push({
            sIdx,
            aIdx,
            customerName: sheet.name,
            date: r.date,
            subject: r.subject,
            price: r.price,
            cash: r.cash,
            dueAmt: d,
            score,
          });
        }
      });

      if (accDue > 0.5) {
        debtors.push({
          sIdx,
          aIdx,
          customerName: sheet.name,
          accountName: acc.name,
          multi: sheet.accounts.length > 1,
          due: accDue,
          phone: acc.phone || sheet.phone,
        });
        totalDue += accDue;
      }
    });
  });

  debtors.sort((a, b) => b.due - a.due);
  recentRows.sort((a, b) => b.score - a.score);
  const topDebtors = debtors.slice(0, 5);
  const topRecents = recentRows.slice(0, 10);

  // Daily target calculation
  const targetAmount = Math.max(1, dailyCashTarget || 10000);
  const progressRatio = Math.min(todayCash / targetAmount, 1);
  const rawPercentage = Math.round((todayCash / targetAmount) * 100);
  const isGoalReached = todayCash >= targetAmount;
  const remainingToGoal = Math.max(0, targetAmount - todayCash);

  // SVG Progress Ring calculations
  const ringRadius = 50;
  const strokeWidth = 9;
  const circumference = 2 * Math.PI * ringRadius;
  const strokeDashoffset = circumference - progressRatio * circumference;

  const handleSaveTarget = () => {
    const val = parseFloat(toEnDigits(targetInput)) || 10000;
    onUpdateDailyTarget(Math.max(100, val));
    setIsEditingTarget(false);
  };

  const presetTargets = [5000, 10000, 20000, 50000, 100000];

  // -------------------------------------------------------------
  // Weekly / Daily Transaction Trend Data for Recharts
  // -------------------------------------------------------------
  interface TrendPoint {
    label: string;
    periodTitle?: string;
    fullDate?: string;
    cashIn: number;
    credit: number;
    totalSales: number;
    dateObj?: Date;
    dayNum?: number;
    monthNum?: number;
    yearNum?: number;
    start?: Date;
    end?: Date;
  }

  const trendData: TrendPoint[] = useMemo(() => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);

    if (trendViewMode === 'daily') {
      // Last 7 days
      const days: TrendPoint[] = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
        const dayNum = d.getDate();
        const monthNum = d.getMonth() + 1;
        const yearNum = d.getFullYear();
        const label = `${toBnDigits(dayNum)} ${MONTH_NAMES[monthNum - 1]?.slice(0, 4) || ''}`;
        days.push({
          dateObj: d,
          dayNum,
          monthNum,
          yearNum,
          label: i === 0 ? 'আজ' : label,
          fullDate: `${toBnDigits(dayNum)}/${toBnDigits(monthNum)}/${toBnDigits(yearNum)}`,
          cashIn: 0,
          credit: 0,
          totalSales: 0,
        });
      }

      sheets.forEach((sheet) => {
        sheet.accounts.forEach((acc) => {
          acc.rows.forEach((r) => {
            const parsed = parseRowDate(r.date);
            if (parsed && parsed.year && parsed.month && parsed.day) {
              const p = parseFloat(toEnDigits(r.price)) || 0;
              const c = parseFloat(toEnDigits(r.cash)) || 0;
              const creditPortion = p > c ? p - c : 0;

              days.forEach((dayItem) => {
                if (
                  parsed.year === dayItem.yearNum &&
                  parsed.month === dayItem.monthNum &&
                  parsed.day === dayItem.dayNum
                ) {
                  dayItem.cashIn += c;
                  dayItem.credit += creditPortion;
                  dayItem.totalSales += p;
                }
              });
            }
          });
        });
      });

      return days;
    } else {
      // Last 6 rolling weeks
      const weeks: TrendPoint[] = [];
      for (let i = 5; i >= 0; i--) {
        const end = new Date(today.getTime() - i * 7 * 24 * 60 * 60 * 1000);
        const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
        start.setHours(0, 0, 0, 0);

        const startStr = `${toBnDigits(start.getDate())} ${MONTH_NAMES[start.getMonth()]?.slice(0, 3) || ''}`;
        const endStr = `${toBnDigits(end.getDate())} ${MONTH_NAMES[end.getMonth()]?.slice(0, 3) || ''}`;
        const label = i === 0 ? 'চলতি সপ্তাহ' : `${startStr} - ${endStr}`;
        const periodTitle = `${startStr} থেকে ${endStr}`;

        weeks.push({
          start,
          end,
          label,
          periodTitle,
          cashIn: 0,
          credit: 0,
          totalSales: 0,
        });
      }

      sheets.forEach((sheet) => {
        sheet.accounts.forEach((acc) => {
          acc.rows.forEach((r) => {
            const parsed = parseRowDate(r.date);
            if (parsed && parsed.year && parsed.month && parsed.day) {
              const rowDate = new Date(parsed.year, parsed.month - 1, parsed.day);
              const p = parseFloat(toEnDigits(r.price)) || 0;
              const c = parseFloat(toEnDigits(r.cash)) || 0;
              const creditPortion = p > c ? p - c : 0;

              weeks.forEach((w) => {
                if (w.start && w.end && rowDate >= w.start && rowDate <= w.end) {
                  w.cashIn += c;
                  w.credit += creditPortion;
                  w.totalSales += p;
                }
              });
            }
          });
        });
      });

      return weeks;
    }
  }, [sheets, trendViewMode]);

  // Aggregate sums for chart period
  const chartTotalCashIn = trendData.reduce((s, item) => s + item.cashIn, 0);
  const chartTotalCredit = trendData.reduce((s, item) => s + item.credit, 0);
  const chartTotalVolume = trendData.reduce((s, item) => s + item.totalSales, 0);
  const chartCashRatio =
    chartTotalVolume > 0 ? Math.round((chartTotalCashIn / chartTotalVolume) * 100) : 0;

  // Custom Recharts Tooltip in Bengali
  const CustomChartTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0]?.payload;
      return (
        <div className="rounded-xl border border-[#E6DFD3] bg-white p-3 shadow-lg text-xs space-y-1.5 min-w-[190px]">
          <div className="font-bold text-[#1C1917] pb-1 border-b border-[#F0EAE1]">
            {dataPoint?.periodTitle || dataPoint?.fullDate || label}
          </div>
          <div className="flex items-center justify-between font-semibold text-emerald-800">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-700" />
              নগদ আদায় (Cash In):
            </span>
            <span className="font-mono-num font-bold">৳{fmt(dataPoint?.cashIn || 0)}</span>
          </div>
          <div className="flex items-center justify-between font-semibold text-[#991B1B]">
            <span className="flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-[#991B1B]" />
              বাকি / ক্রেডিট (Credit):
            </span>
            <span className="font-mono-num font-bold">৳{fmt(dataPoint?.credit || 0)}</span>
          </div>
          <div className="flex items-center justify-between text-[#78716C] pt-1 border-t border-[#F0EAE1]">
            <span>মোট বিক্রিঃ</span>
            <span className="font-mono-num font-bold text-[#1C1917]">
              ৳{fmt(dataPoint?.totalSales || 0)}
            </span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden mb-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex items-center justify-between border-b border-[#F0EAE1] bg-[#FAF8F5] p-4 sm:px-6">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3E36] text-white">
            <Home className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif-bn text-lg font-bold text-[#1C1917]">
              ব্যবসা ও আর্থিক ড্যাশবোর্ড
            </h2>
            <p className="text-xs text-[#78716C]">
              আজকের লক্ষ্যমাত্রা, সাপ্তাহিক ট্রেন্ড, বিক্রি, আদায় ও বকেয়া হিসাবের সার্বিক চিত্র
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

      <div className="p-4 sm:p-6 space-y-6">
        {/* Daily Cash Target Progress Ring Hero Card */}
        <div className="rounded-2xl border border-[#E6DFD3] bg-gradient-to-br from-[#FAF8F5] via-white to-[#F6F2E9] p-5 sm:p-6 shadow-xs relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-emerald-50/50 pointer-events-none" />

          <div className="relative flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Progress Ring Graphic with Center Content */}
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center flex-shrink-0">
                <svg width="128" height="128" className="transform -rotate-90">
                  <circle
                    cx="64"
                    cy="64"
                    r={ringRadius}
                    stroke="#E6DFD3"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                  />
                  <circle
                    cx="64"
                    cy="64"
                    r={ringRadius}
                    stroke={isGoalReached ? '#15803D' : '#0F3E36'}
                    strokeWidth={strokeWidth}
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                    fill="transparent"
                    className="transition-all duration-700 ease-out"
                  />
                </svg>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span
                    className={`font-mono-num text-2xl font-bold tracking-tight ${
                      isGoalReached ? 'text-emerald-800' : 'text-[#0F3E36]'
                    }`}
                  >
                    {toBnDigits(rawPercentage)}%
                  </span>
                  <span className="text-[11px] font-semibold text-[#78716C]">
                    {isGoalReached ? 'পূর্ণ' : 'অর্জিত'}
                  </span>
                </div>
              </div>

              {/* Progress Summary Text */}
              <div>
                <div className="flex items-center gap-2">
                  <span className="flex items-center gap-1 rounded-full bg-[#0F3E36]/10 px-2.5 py-0.5 text-[11px] font-bold text-[#0F3E36]">
                    <Target className="h-3 w-3" /> আজকের দৈনিক লক্ষ্যমাত্রা
                  </span>
                  <span className="text-xs text-[#78716C]">{todayBn()}</span>
                </div>

                <h3 className="font-serif-bn text-xl sm:text-2xl font-bold text-[#1C1917] mt-1.5">
                  আজকের নগদ আদায়ঃ{' '}
                  <span className="font-mono-num text-emerald-800 font-bold">
                    ৳{fmt(todayCash)}
                  </span>
                </h3>

                <div className="flex items-center gap-2 mt-1 text-xs text-[#57534E]">
                  <span>নির্ধারিত দৈনিক টার্গেটঃ</span>
                  <span className="font-mono-num font-bold text-[#1C1917]">
                    ৳{fmt(targetAmount)}
                  </span>
                  {!isEditingTarget && (
                    <button
                      type="button"
                      onClick={() => {
                        setTargetInput(String(targetAmount));
                        setIsEditingTarget(true);
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#C28B1E] hover:underline"
                    >
                      <Edit2 className="h-3 w-3" /> লক্ষ্যমাত্রা পরিবর্তন
                    </button>
                  )}
                </div>

                <div className="mt-3">
                  {isGoalReached ? (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-100/80 px-3 py-1.5 text-xs font-bold text-emerald-900">
                      <Sparkles className="h-3.5 w-3.5 text-emerald-700" />
                      🎉 অভিনন্দন! আজকের লক্ষ্যমাত্রা ({toBnDigits(rawPercentage)}%) সফলভাবে অর্জিত হয়েছে!
                    </div>
                  ) : (
                    <div className="inline-flex items-center gap-1.5 rounded-xl bg-[#F3EFE6] px-3 py-1.5 text-xs text-[#57534E]">
                      <Flame className="h-3.5 w-3.5 text-[#C28B1E]" />
                      আজকের লক্ষ্যমাত্রায় পৌঁছাতে আরও{' '}
                      <b className="font-mono-num text-[#991B1B]">৳{fmt(remainingToGoal)}</b> নগদ আদায় প্রয়োজন।
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Target Editor Controls */}
            {isEditingTarget ? (
              <div className="rounded-xl border border-[#E6DFD3] bg-white p-3.5 shadow-xs w-full md:w-auto min-w-[260px] space-y-2.5 animate-in fade-in duration-150">
                <div className="flex items-center justify-between text-xs font-bold text-[#1C1917]">
                  <span>দৈনিক লক্ষ্যমাত্রা নির্ধারণ করুনঃ</span>
                  <button
                    type="button"
                    onClick={() => setIsEditingTarget(false)}
                    className="text-[#78716C] hover:text-[#1C1917]"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono-num font-bold text-sm text-[#78716C]">৳</span>
                  <input
                    type="text"
                    value={targetInput}
                    onChange={(e) => setTargetInput(e.target.value)}
                    placeholder="10000"
                    className="w-full rounded-lg border border-[#E6DFD3] bg-[#FAF8F5] px-3 py-1.5 text-sm font-mono-num font-bold text-[#1C1917] focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
                  />
                  <button
                    type="button"
                    onClick={handleSaveTarget}
                    className="inline-flex items-center gap-1 rounded-lg bg-[#0F3E36] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#0A2B25] active:scale-95 transition"
                  >
                    <Check className="h-3.5 w-3.5" /> সেভ
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-1 pt-1">
                  <span className="text-[10px] text-[#78716C] w-full mb-0.5">দ্রুত নির্বাচনঃ</span>
                  {presetTargets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => {
                        onUpdateDailyTarget(amt);
                        setTargetInput(String(amt));
                        setIsEditingTarget(false);
                      }}
                      className="rounded-md border border-[#E6DFD3] bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-mono-num font-bold text-[#57534E] hover:border-[#0F3E36] hover:bg-white"
                    >
                      ৳{fmt(amt)}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="hidden md:flex flex-col items-end text-right">
                <span className="text-[11px] font-semibold text-[#78716C]">আজকের বিক্রি</span>
                <span className="font-mono-num text-lg font-bold text-[#1C1917]">
                  ৳{fmt(todaySales)}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setTargetInput(String(targetAmount));
                    setIsEditingTarget(true);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD3] bg-white px-3 py-1.5 text-xs font-bold text-[#0F3E36] hover:bg-[#FAF8F5] shadow-2xs transition"
                >
                  <Target className="h-3.5 w-3.5 text-[#C28B1E]" /> টার্গেট বদলান
                </button>
              </div>
            )}
          </div>
        </div>

        {/* KPI Cards Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-2xl border border-red-200 bg-gradient-to-br from-[#FEF2F2] to-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-bold text-[#991B1B]">
              <span>সর্বমোট বকেয়া বাকি</span>
              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px]">
                বকেয়া
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1 font-mono-num text-2xl sm:text-3xl font-bold text-[#991B1B]">
              <span className="text-base">৳</span>
              <span>{fmt(totalDue)}</span>
            </div>
            <div className="mt-2 text-[11px] text-[#78716C]">
              মোট {toBnDigits(debtors.length)} টি গ্রাহক হিসাবে বকেয়া রয়েছে
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6DFD3] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#78716C]">
              <span>চলতি মাসের বিক্রি</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                বিক্রি
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1 font-mono-num text-2xl sm:text-3xl font-bold text-[#1C1917]">
              <span className="text-base text-[#78716C]">৳</span>
              <span>{fmt(monthPrice)}</span>
            </div>
            <div className="mt-2 text-[11px] text-[#78716C]">
              চলতি মাসের সকল গ্রাহকের মোট হিসাব
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6DFD3] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#78716C]">
              <span>চলতি মাসের নগদ আদায়</span>
              <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                ক্যাশ
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1 font-mono-num text-2xl sm:text-3xl font-bold text-emerald-800">
              <span className="text-base">৳</span>
              <span>{fmt(monthCash)}</span>
            </div>
            <div className="mt-2 text-[11px] text-[#78716C]">
              বকেয়া ও চলতি বাবদ নগদ প্রাপ্তি
            </div>
          </div>

          <div className="rounded-2xl border border-[#E6DFD3] bg-white p-4 sm:p-5 shadow-xs">
            <div className="flex items-center justify-between text-xs font-semibold text-[#78716C]">
              <span>মোট গ্রাহক সংখ্যা</span>
              <span className="rounded-full bg-[#FAF8F5] px-2 py-0.5 text-[10px] font-bold text-[#57534E]">
                খাতা
              </span>
            </div>
            <div className="mt-3 flex items-baseline gap-1 font-mono-num text-2xl sm:text-3xl font-bold text-[#1C1917]">
              <span>{toBnDigits(sheets.length)}</span>
              <span className="text-sm font-normal text-[#78716C] ml-1">জন</span>
            </div>
            <div className="mt-2 text-[11px] text-[#78716C]">
              সকল তালিকাভুক্ত সক্রিয় গ্রাহক
            </div>
          </div>
        </div>

        {/* ------------------------------------------------------------------ */}
        {/* Recharts Integration: Weekly Transaction Trend (Cash In vs. Credit) */}
        {/* ------------------------------------------------------------------ */}
        <div className="rounded-2xl border border-[#E6DFD3] bg-white p-5 sm:p-6 shadow-xs space-y-4">
          {/* Chart Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-[#F0EAE1]">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0F3E36]/10 text-[#0F3E36]">
                  <TrendingUp className="h-4 w-4" />
                </div>
                <h3 className="font-serif-bn text-base sm:text-lg font-bold text-[#1C1917]">
                  লেনদেন ট্রেন্ডঃ নগদ আদায় বনাম বাকি (Cash In vs. Credit)
                </h3>
              </div>
              <p className="text-xs text-[#78716C] mt-0.5">
                সময়ের সাথে ব্যবসায় নগদ প্রাপ্তি ও বাকির অনুপাত বিশ্লেষণ করুন
              </p>
            </div>

            {/* Mode & Chart Type Switches */}
            <div className="flex items-center gap-2">
              {/* Daily vs Weekly Switch */}
              <div className="flex items-center rounded-xl bg-[#F3EFE6] p-1 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setTrendViewMode('weekly')}
                  className={`rounded-lg px-3 py-1 transition ${
                    trendViewMode === 'weekly'
                      ? 'bg-white text-[#0F3E36] font-bold shadow-2xs'
                      : 'text-[#57534E]'
                  }`}
                >
                  সাপ্তাহিক (৬ সপ্তাহ)
                </button>
                <button
                  type="button"
                  onClick={() => setTrendViewMode('daily')}
                  className={`rounded-lg px-3 py-1 transition ${
                    trendViewMode === 'daily'
                      ? 'bg-white text-[#0F3E36] font-bold shadow-2xs'
                      : 'text-[#57534E]'
                  }`}
                >
                  দৈনিক (৭ দিন)
                </button>
              </div>

              {/* Bar vs Area Chart Type */}
              <div className="flex items-center rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] p-0.5 text-xs">
                <button
                  type="button"
                  title="বার চার্ট"
                  onClick={() => setChartType('bar')}
                  className={`p-1.5 rounded-lg transition ${
                    chartType === 'bar' ? 'bg-white text-[#0F3E36] shadow-2xs' : 'text-[#78716C]'
                  }`}
                >
                  <BarChart3 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  title="মসৃণ এরিয়া ট্রেন্ড"
                  onClick={() => setChartType('area')}
                  className={`p-1.5 rounded-lg transition ${
                    chartType === 'area' ? 'bg-white text-[#0F3E36] shadow-2xs' : 'text-[#78716C]'
                  }`}
                >
                  <LineChart className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar for Chart Timeframe */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#FAF8F5] border border-[#E6DFD3] rounded-xl p-3 text-xs">
            <div className="flex items-center justify-between sm:justify-start sm:gap-3">
              <span className="text-[#78716C] flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-700" />
                সময়কালের মোট নগদঃ
              </span>
              <span className="font-mono-num font-bold text-emerald-800 text-sm">
                ৳{fmt(chartTotalCashIn)}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:border-l sm:border-[#E6DFD3] sm:pl-3">
              <span className="text-[#78716C] flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-[#991B1B]" />
                সময়কালের মোট বাকিঃ
              </span>
              <span className="font-mono-num font-bold text-[#991B1B] text-sm">
                ৳{fmt(chartTotalCredit)}
              </span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:border-l sm:border-[#E6DFD3] sm:pl-3">
              <span className="text-[#78716C]">নগদ আদায়ের শতকরা হারঃ</span>
              <span className="font-mono-num font-bold text-[#0F3E36] text-sm">
                {toBnDigits(chartCashRatio)}%
              </span>
            </div>
          </div>

          {/* Recharts Visualization Viewport */}
          <div className="w-full h-72 sm:h-80 pt-2">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              {chartType === 'bar' ? (
                <BarChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#78716C', fontSize: 11 }}
                    axisLine={{ stroke: '#E6DFD3' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#78716C', fontSize: 11 }}
                    axisLine={{ stroke: '#E6DFD3' }}
                    tickLine={false}
                    tickFormatter={(val) => `৳${fmt(val)}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    formatter={(value) =>
                      value === 'cashIn'
                        ? 'নগদ আদায় (Cash In)'
                        : value === 'credit'
                        ? 'বাকি / ক্রেডিট (Credit)'
                        : value
                    }
                  />
                  <Bar
                    dataKey="cashIn"
                    name="cashIn"
                    fill="#15803D"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                  <Bar
                    dataKey="credit"
                    name="credit"
                    fill="#991B1B"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              ) : (
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCashIn" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#15803D" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#15803D" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorCredit" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#991B1B" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#991B1B" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0EAE1" vertical={false} />
                  <XAxis
                    dataKey="label"
                    tick={{ fill: '#78716C', fontSize: 11 }}
                    axisLine={{ stroke: '#E6DFD3' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fill: '#78716C', fontSize: 11 }}
                    axisLine={{ stroke: '#E6DFD3' }}
                    tickLine={false}
                    tickFormatter={(val) => `৳${fmt(val)}`}
                  />
                  <Tooltip content={<CustomChartTooltip />} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ paddingBottom: '12px', fontSize: '12px' }}
                    formatter={(value) =>
                      value === 'cashIn'
                        ? 'নগদ আদায় (Cash In)'
                        : value === 'credit'
                        ? 'বাকি / ক্রেডিট (Credit)'
                        : value
                    }
                  />
                  <Area
                    type="monotone"
                    dataKey="cashIn"
                    name="cashIn"
                    stroke="#15803D"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCashIn)"
                  />
                  <Area
                    type="monotone"
                    dataKey="credit"
                    name="credit"
                    stroke="#991B1B"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorCredit)"
                  />
                </AreaChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2-Column Split: Top Debtors + Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Top 5 Debtors Leaderboard */}
          <div className="rounded-2xl border border-[#E6DFD3] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0EAE1]">
                <h3 className="font-serif-bn font-bold text-sm text-[#991B1B] flex items-center gap-1.5">
                  🔝 শীর্ষ ৫ বকেয়া বাকি গ্রাহক
                </h3>
                <span className="text-[11px] text-[#78716C]">বাকি অনুযায়ী সাজানো</span>
              </div>

              {topDebtors.length === 0 ? (
                <p className="text-xs text-[#78716C] text-center py-10">কোনো বকেয়া পাওয়া যায়নি</p>
              ) : (
                <div className="divide-y divide-[#F0EAE1]">
                  {topDebtors.map((d, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-3 text-xs hover:bg-[#FAF8F5] px-2 rounded-xl transition"
                    >
                      <div
                        className="cursor-pointer group flex items-center gap-2.5 min-w-0 flex-1"
                        onClick={() => onSelectCustomer(d.sIdx, d.aIdx)}
                      >
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 font-mono-num font-bold text-[11px] text-[#991B1B]">
                          {toBnDigits(idx + 1)}
                        </span>
                        <div className="truncate">
                          <div className="font-bold text-[#1C1917] group-hover:text-[#0F3E36] transition-colors">
                            {d.customerName}
                          </div>
                          {d.multi && (
                            <div className="text-[11px] text-[#78716C]">হিসাবঃ {d.accountName}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="font-mono-num font-bold text-[#991B1B] text-sm mr-1">
                          ৳{fmt(d.due)}
                        </span>
                        <button
                          type="button"
                          title="WhatsApp এ তাগাদা মেসেজ পাঠান"
                          onClick={() => onSendDueReminder(d.sIdx, d.aIdx)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-700 px-2.5 py-1 text-white text-[11px] font-bold shadow-2xs hover:bg-emerald-800 transition active:scale-95"
                        >
                          <Share2 className="h-3 w-3" /> তাগাদা
                        </button>
                        <button
                          type="button"
                          title="বাকি পরিশোধ মার্ক করুন"
                          onClick={() => onMarkAccountPaid(d.sIdx, d.aIdx)}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#C28B1E] px-2.5 py-1 text-[#1C1917] text-[11px] font-bold shadow-2xs hover:bg-[#D4A33B] transition active:scale-95"
                        >
                          <CheckCircle className="h-3 w-3 text-emerald-950" /> পরিশোধ
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent 10 Transactions Timeline */}
          <div className="rounded-2xl border border-[#E6DFD3] bg-white p-5 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#F0EAE1]">
                <h3 className="font-serif-bn font-bold text-sm text-[#0F3E36] flex items-center gap-1.5">
                  <Clock className="h-4 w-4 text-[#C28B1E]" /> সাম্প্রতিক লেনদেন সমূহ (সর্বশেষ ১০টি)
                </h3>
                <span className="text-[11px] text-[#78716C]">ক্লিক করে খাতায় যান</span>
              </div>

              {topRecents.length === 0 ? (
                <p className="text-xs text-[#78716C] text-center py-10">কোনো লেনদেন পাওয়া যায়নি</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-[#78716C] border-b border-[#F0EAE1]">
                        <th className="pb-2 font-semibold">তারিখ</th>
                        <th className="pb-2 font-semibold">গ্রাহক</th>
                        <th className="pb-2 font-semibold">বিবরণ</th>
                        <th className="pb-2 text-right font-semibold">মূল্য</th>
                        <th className="pb-2 text-right font-semibold text-emerald-800">নগদ</th>
                        <th className="pb-2 text-right font-semibold text-[#991B1B]">বাকি</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#F0EAE1]">
                      {topRecents.map((r, idx) => (
                        <tr
                          key={idx}
                          className="hover:bg-[#FAF8F5] cursor-pointer transition-colors"
                          onClick={() => onSelectCustomer(r.sIdx, r.aIdx)}
                        >
                          <td className="py-2.5 text-[#78716C] whitespace-nowrap">{r.date}</td>
                          <td className="py-2.5 font-bold text-[#1C1917] whitespace-nowrap">
                            {r.customerName}
                          </td>
                          <td className="py-2.5 text-[#57534E] truncate max-w-[120px]">
                            {r.subject}
                          </td>
                          <td className="py-2.5 text-right font-mono-num font-semibold text-[#1C1917]">
                            {r.price ? `৳${fmt(r.price)}` : '—'}
                          </td>
                          <td className="py-2.5 text-right font-mono-num font-semibold text-emerald-800">
                            {r.cash ? `৳${fmt(r.cash)}` : '—'}
                          </td>
                          <td className="py-2.5 text-right font-mono-num font-bold text-[#991B1B]">
                            {r.dueAmt !== '' ? `৳${fmt(r.dueAmt)}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
