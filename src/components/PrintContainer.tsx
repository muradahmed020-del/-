import React from 'react';
import { Sheet, Account, Invoice, Note, ShopInfo } from '../types';
import { fmt, toBnDigits, due, todayBn, formatReceiptNo, formatInvoiceNo, bnMoney, calcNoteTotals } from '../utils/bengali';

export interface PrintData {
  type: 'receipt' | 'combinedReceipt' | 'sheet' | 'allSummary' | 'allDetail' | 'invoice' | 'notes' | 'rawHtml';
  shopInfo: ShopInfo;
  sheet?: Sheet;
  account?: Account;
  receiptNo?: number;
  sheets?: Sheet[];
  invoice?: Invoice;
  notes?: Note[];
  htmlContent?: string;
  periodLabel?: string;
}

export const PrintContainer: React.FC<{ data: PrintData | null }> = ({ data }) => {
  if (!data) return null;

  const { shopInfo, type } = data;

  return (
    <div id="printArea" className="hidden font-sans-bn text-[#2A251E]">
      {/* 1. Single Receipt */}
      {type === 'receipt' && data.sheet && data.account && (
        <div className="max-w-2xl mx-auto p-4 border border-neutral-300 rounded-lg">
          <div className="text-center pb-4 mb-4 border-b-2 border-neutral-800">
            <h1 className="font-serif-bn text-2xl font-bold">{shopInfo.name || 'রশিদ'}</h1>
            {shopInfo.address && <p className="text-xs text-neutral-600 mt-1">{shopInfo.address}</p>}
            {shopInfo.phone && <p className="text-xs text-neutral-600">ফোনঃ {shopInfo.phone}</p>}
          </div>

          <div className="flex justify-between text-xs font-mono-num mb-3">
            <div>রশিদ নংঃ {formatReceiptNo(data.receiptNo || 1)}</div>
            <div>তারিখঃ {todayBn()}</div>
          </div>

          <div className="font-serif-bn font-bold text-base text-[#8C2F24] mb-3">
            গ্রাহকের নামঃ {data.sheet.name}
            {data.sheet.accounts.length > 1 && (
              <span className="text-xs font-normal text-neutral-600"> ({data.account.name})</span>
            )}
          </div>

          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="border-b-2 border-neutral-800 text-left">
                <th className="py-2 px-2 text-center w-10">নং</th>
                <th className="py-2 px-2">তারিখ</th>
                <th className="py-2 px-2">বিষয়</th>
                <th className="py-2 px-2">ক্যাটাগরি</th>
                <th className="py-2 px-2 text-right">মূল্য</th>
                <th className="py-2 px-2 text-right">নগদ</th>
                <th className="py-2 px-2 text-right text-[#8C2F24]">বাকি</th>
                <th className="py-2 px-2">মন্তব্য</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {(() => {
                let pTotal = 0;
                let cTotal = 0;
                let dTotal = 0;
                const rows = data.account.rows.filter((r) => r.subject || r.price || r.cash);
                return (
                  <>
                    {rows.map((r, i) => {
                      const p = parseFloat(r.price) || 0;
                      const c = parseFloat(r.cash) || 0;
                      const d = due(r);
                      pTotal += p;
                      cTotal += c;
                      if (d !== '') dTotal += d;
                      return (
                        <tr key={i}>
                          <td className="py-1.5 px-2 text-center font-mono-num">{toBnDigits(i + 1)}</td>
                          <td className="py-1.5 px-2">{r.date}</td>
                          <td className="py-1.5 px-2 font-medium">{r.subject}</td>
                          <td className="py-1.5 px-2 text-neutral-600">{r.category || '—'}</td>
                          <td className="py-1.5 px-2 text-right font-mono-num">
                            {r.price ? `৳${fmt(r.price)}` : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-num">
                            {r.cash ? `৳${fmt(r.cash)}` : '—'}
                          </td>
                          <td className="py-1.5 px-2 text-right font-mono-num font-bold text-[#8C2F24]">
                            {d !== '' ? `৳${fmt(d)}` : '—'}
                          </td>
                          <td className="py-1.5 px-2">{r.comment}</td>
                        </tr>
                      );
                    })}
                    <tr className="border-t-2 border-neutral-800 font-bold">
                      <td colSpan={4} className="py-2 px-2 font-serif-bn">
                        মোটঃ
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">৳{fmt(pTotal)}</td>
                      <td className="py-2 px-2 text-right font-mono-num">৳{fmt(cTotal)}</td>
                      <td className="py-2 px-2 text-right font-mono-num text-[#8C2F24]">৳{fmt(dTotal)}</td>
                      <td></td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>

          <div className="flex justify-between mt-12 pt-4 text-xs text-neutral-600">
            <div className="w-36 text-center border-t border-neutral-700 pt-1">গ্রাহকের স্বাক্ষর</div>
            <div className="w-36 text-center border-t border-neutral-700 pt-1">বিক্রেতার স্বাক্ষর</div>
          </div>
        </div>
      )}

      {/* 2. Combined Receipt */}
      {type === 'combinedReceipt' && data.sheet && (
        <div className="max-w-2xl mx-auto p-4 border border-neutral-300 rounded-lg">
          <div className="text-center pb-4 mb-4 border-b-2 border-neutral-800">
            <h1 className="font-serif-bn text-2xl font-bold">{shopInfo.name || 'রশিদ'}</h1>
            {shopInfo.address && <p className="text-xs text-neutral-600 mt-1">{shopInfo.address}</p>}
            {shopInfo.phone && <p className="text-xs text-neutral-600">ফোনঃ {shopInfo.phone}</p>}
          </div>

          <div className="flex justify-between text-xs font-mono-num mb-3">
            <div>রশিদ নংঃ {formatReceiptNo(data.receiptNo || 1)}</div>
            <div>তারিখঃ {todayBn()}</div>
          </div>

          <div className="font-serif-bn font-bold text-base text-[#8C2F24] mb-3">
            গ্রাহকের নামঃ {data.sheet.name} (সব হিসাব মিলিয়ে)
          </div>

          <table className="w-full text-xs border-collapse mb-4">
            <thead>
              <tr className="border-b-2 border-neutral-800 text-left">
                <th className="py-2 px-2 text-center w-10">নং</th>
                <th className="py-2 px-2">তারিখ</th>
                <th className="py-2 px-2">বিষয়</th>
                <th className="py-2 px-2">ক্যাটাগরি</th>
                <th className="py-2 px-2 text-right">মূল্য</th>
                <th className="py-2 px-2 text-right">নগদ</th>
                <th className="py-2 px-2 text-right text-[#8C2F24]">বাকি</th>
                <th className="py-2 px-2">মন্তব্য</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let pTotal = 0;
                let cTotal = 0;
                let dTotal = 0;
                let rowCount = 0;
                return (
                  <>
                    {data.sheet.accounts.map((acc, aIdx) => (
                      <React.Fragment key={aIdx}>
                        <tr className="bg-neutral-100 font-bold border-t border-neutral-300">
                          <td colSpan={8} className="py-1.5 px-2 text-[#1F5C53]">
                            হিসাবঃ {acc.name}
                          </td>
                        </tr>
                        {acc.rows
                          .filter((r) => r.subject || r.price || r.cash)
                          .map((r, i) => {
                            rowCount++;
                            const p = parseFloat(r.price) || 0;
                            const c = parseFloat(r.cash) || 0;
                            const d = due(r);
                            pTotal += p;
                            cTotal += c;
                            if (d !== '') dTotal += d;
                            return (
                              <tr key={i} className="border-b border-neutral-200">
                                <td className="py-1.5 px-2 text-center font-mono-num">
                                  {toBnDigits(rowCount)}
                                </td>
                                <td className="py-1.5 px-2">{r.date}</td>
                                <td className="py-1.5 px-2">{r.subject}</td>
                                <td className="py-1.5 px-2 text-neutral-600">{r.category || '—'}</td>
                                <td className="py-1.5 px-2 text-right font-mono-num">
                                  {r.price ? `৳${fmt(r.price)}` : '—'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono-num">
                                  {r.cash ? `৳${fmt(r.cash)}` : '—'}
                                </td>
                                <td className="py-1.5 px-2 text-right font-mono-num font-bold text-[#8C2F24]">
                                  {d !== '' ? `৳${fmt(d)}` : '—'}
                                </td>
                                <td className="py-1.5 px-2">{r.comment}</td>
                              </tr>
                            );
                          })}
                      </React.Fragment>
                    ))}
                    <tr className="border-t-2 border-neutral-800 font-bold">
                      <td colSpan={4} className="py-2 px-2 font-serif-bn">
                        সর্বমোটঃ
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">৳{fmt(pTotal)}</td>
                      <td className="py-2 px-2 text-right font-mono-num">৳{fmt(cTotal)}</td>
                      <td className="py-2 px-2 text-right font-mono-num text-[#8C2F24]">৳{fmt(dTotal)}</td>
                      <td></td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>

          <div className="flex justify-between mt-12 pt-4 text-xs text-neutral-600">
            <div className="w-36 text-center border-t border-neutral-700 pt-1">গ্রাহকের স্বাক্ষর</div>
            <div className="w-36 text-center border-t border-neutral-700 pt-1">বিক্রেতার স্বাক্ষর</div>
          </div>
        </div>
      )}

      {/* 3. Customer Ledger Sheet */}
      {type === 'sheet' && data.sheet && data.account && (
        <div>
          <div className="border-b-2 border-neutral-800 pb-3 mb-4">
            <h1 className="font-serif-bn text-xl font-bold text-[#8C2F24]">
              {data.sheet.name}
              {data.sheet.accounts.length > 1 && (
                <span className="font-normal text-sm text-neutral-600"> — {data.account.name}</span>
              )}
            </h1>
            <p className="text-xs text-neutral-500 mt-1">প্রিন্ট করার তারিখঃ {todayBn()}</p>
          </div>

          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b-2 border-neutral-800 text-left">
                <th className="py-2 px-2 text-center w-12">নং</th>
                <th className="py-2 px-2 w-24">তারিখ</th>
                <th className="py-2 px-2">বিষয়</th>
                <th className="py-2 px-2 w-28">ক্যাটাগরি</th>
                <th className="py-2 px-2 text-right w-24">মূল্য</th>
                <th className="py-2 px-2 text-right w-24">নগদ</th>
                <th className="py-2 px-2 text-right w-24 text-[#8C2F24]">বাকি</th>
                <th className="py-2 px-2">মন্তব্য</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {(() => {
                let tp = 0;
                let tc = 0;
                let td = 0;
                return (
                  <>
                    {data.account.rows
                      .filter((r) => r.subject || r.price || r.cash)
                      .map((r, i) => {
                        const p = parseFloat(r.price) || 0;
                        const c = parseFloat(r.cash) || 0;
                        const d = due(r);
                        tp += p;
                        tc += c;
                        if (d !== '') td += d;
                        return (
                          <tr key={i}>
                            <td className="py-1.5 px-2 text-center font-mono-num">{toBnDigits(i + 1)}</td>
                            <td className="py-1.5 px-2">{r.date}</td>
                            <td className="py-1.5 px-2 font-medium">{r.subject}</td>
                            <td className="py-1.5 px-2 text-neutral-600">{r.category || '—'}</td>
                            <td className="py-1.5 px-2 text-right font-mono-num">
                              {r.price ? `৳${fmt(r.price)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono-num">
                              {r.cash ? `৳${fmt(r.cash)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2 text-right font-mono-num font-bold text-[#8C2F24]">
                              {d !== '' ? `৳${fmt(d)}` : '—'}
                            </td>
                            <td className="py-1.5 px-2">{r.comment}</td>
                          </tr>
                        );
                      })}
                    <tr className="border-t-2 border-neutral-800 font-bold">
                      <td colSpan={4} className="py-2 px-2 font-serif-bn">
                        সর্বমোটঃ
                      </td>
                      <td className="py-2 px-2 text-right font-mono-num">৳{fmt(tp)}</td>
                      <td className="py-2 px-2 text-right font-mono-num">৳{fmt(tc)}</td>
                      <td className="py-2 px-2 text-right font-mono-num text-[#8C2F24]">৳{fmt(td)}</td>
                      <td></td>
                    </tr>
                  </>
                );
              })()}
            </tbody>
          </table>
        </div>
      )}

      {/* 4. Professional Invoice Document */}
      {type === 'invoice' && data.invoice && (
        <div className="max-w-2xl mx-auto p-6 border border-neutral-300 rounded-lg">
          <div className="h-2 w-full bg-gradient-to-r from-[#1F5C53] via-[#C6992E] to-[#1F5C53] rounded mb-5" />

          <div className="flex justify-between items-start pb-4 border-b border-neutral-200">
            <div>
              <h1 className="font-serif-bn text-2xl font-bold text-[#163F39]">
                {shopInfo.name || 'আমাদের প্রতিষ্ঠান'}
              </h1>
              {shopInfo.address && <p className="text-xs text-neutral-600 mt-0.5">{shopInfo.address}</p>}
              {shopInfo.phone && <p className="text-xs text-neutral-600">ফোনঃ {shopInfo.phone}</p>}
            </div>
            <div className="text-right">
              <div className="font-serif-bn font-bold text-2xl text-[#8C2F24]">ইনভয়েস</div>
              <div className="font-mono-num text-xs mt-1">নংঃ #{formatInvoiceNo(data.invoice.no)}</div>
              <div className="text-xs text-neutral-600">তারিখঃ {data.invoice.date}</div>
            </div>
          </div>

          <div className="my-4 rounded bg-[#F6F1E6] p-3 border-l-4 border-[#C6992E]">
            <span className="text-[10px] uppercase font-bold text-neutral-500 block">বিল গ্রহীতাঃ</span>
            <span className="font-serif-bn font-bold text-base text-[#8C2F24]">
              {data.invoice.customerName}
            </span>
          </div>

          <table className="w-full text-xs border-collapse mb-5">
            <thead>
              <tr className="bg-[#163F39] text-white text-left">
                <th className="py-2 px-3 text-center w-10">#</th>
                <th className="py-2 px-3">পণ্য বা বিষয়</th>
                <th className="py-2 px-3 text-right w-20">পরিমাণ</th>
                <th className="py-2 px-3 text-right w-24">এককমূল্য</th>
                <th className="py-2 px-3 text-right w-24">মোট</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-200">
              {data.invoice.items.map((it, idx) => {
                const q = parseFloat(it.qty) || 1;
                const p = parseFloat(it.price) || 0;
                return (
                  <tr key={idx}>
                    <td className="py-2 px-3 text-center font-mono-num">{toBnDigits(idx + 1)}</td>
                    <td className="py-2 px-3 font-medium">
                      {it.subject}
                      {it.comment && <span className="block text-[11px] text-neutral-500">{it.comment}</span>}
                    </td>
                    <td className="py-2 px-3 text-right font-mono-num">{toBnDigits(it.qty)}</td>
                    <td className="py-2 px-3 text-right font-mono-num">৳{fmt(it.price)}</td>
                    <td className="py-2 px-3 text-right font-mono-num font-bold">৳{fmt(q * p)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <div className="flex justify-between items-start gap-6">
            <div className="flex-1 text-xs text-neutral-600">
              {data.invoice.note && (
                <p>
                  <b>মন্তব্যঃ</b> {data.invoice.note}
                </p>
              )}
            </div>

            <div className="w-64 border border-neutral-300 rounded text-xs divide-y divide-neutral-200">
              <div className="flex justify-between p-2">
                <span>সাব-টোটালঃ</span>
                <span className="font-mono-num">৳{fmt(data.invoice.subtotal)}</span>
              </div>
              {data.invoice.discount > 0 && (
                <div className="flex justify-between p-2 text-neutral-600">
                  <span>ছাড়ঃ</span>
                  <span className="font-mono-num">-৳{fmt(data.invoice.discount)}</span>
                </div>
              )}
              {data.invoice.vatAmount > 0 && (
                <div className="flex justify-between p-2 text-neutral-600">
                  <span>ভ্যাট ({toBnDigits(data.invoice.vatPercent)}%):</span>
                  <span className="font-mono-num">+৳{fmt(data.invoice.vatAmount)}</span>
                </div>
              )}
              <div className="flex justify-between p-2 font-bold bg-neutral-100 text-sm">
                <span>সর্বমোটঃ</span>
                <span className="font-mono-num">৳{fmt(data.invoice.grandTotal)}</span>
              </div>
              <div className="flex justify-between p-2">
                <span>নগদ প্রাপ্তঃ</span>
                <span className="font-mono-num font-semibold text-[#1F5C53]">
                  ৳{fmt(data.invoice.paidNow)}
                </span>
              </div>
              <div className="flex justify-between p-2 font-bold bg-[#8C2F24] text-white">
                <span>বাকি (এই ইনভয়েস):</span>
                <span className="font-mono-num">৳{fmt(data.invoice.due)}</span>
              </div>
              {data.invoice.previousDue > 0 && (
                <>
                  <div className="flex justify-between p-2 text-xs">
                    <span>পূর্বের বাকিঃ</span>
                    <span className="font-mono-num">৳{fmt(data.invoice.previousDue)}</span>
                  </div>
                  <div className="flex justify-between p-2 font-bold bg-[#8C2F24] text-white">
                    <span>মোট বাকি (সব মিলিয়ে):</span>
                    <span className="font-mono-num">৳{fmt(data.invoice.totalDueAll)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex justify-between mt-12 pt-4 text-xs text-neutral-600">
            <div className="w-36 text-center border-t border-neutral-700 pt-1">গ্রাহকের স্বাক্ষর</div>
            <div className="w-36 text-center border-t border-neutral-700 pt-1">বিক্রেতার স্বাক্ষর</div>
          </div>

          <p className="text-center text-xs text-neutral-500 italic mt-6">ধন্যবাদ, আবার আসবেন! 🙏</p>
        </div>
      )}

      {/* 5. Notes Print */}
      {type === 'notes' && data.notes && (
        <div className="max-w-2xl mx-auto space-y-4">
          <div className="border-b-2 border-neutral-800 pb-2 mb-4">
            <h1 className="font-serif-bn text-xl font-bold text-[#8C2F24]">📝 নোট বুক</h1>
            <p className="text-xs text-neutral-500 mt-0.5">
              মোট {toBnDigits(data.notes.length)} টি নোট • প্রিন্ট করা হয়েছেঃ {todayBn()}
            </p>
          </div>

          {data.notes.map((n) => {
            const totals = n.calc ? calcNoteTotals(n.text) : null;
            return (
              <div
                key={n.id}
                className="p-4 border border-neutral-300 rounded-lg space-y-2 break-inside-avoid"
              >
                <h3 className="font-serif-bn font-bold text-sm text-[#8C2F24]">
                  {n.pinned ? '📌 ' : ''}
                  {n.title}
                </h3>
                <p className="whitespace-pre-wrap text-xs text-[#2A251E] leading-relaxed">{n.text}</p>
                {totals && totals.count > 0 && (
                  <div className="border-t border-dashed border-neutral-300 pt-2 text-xs">
                    <span>যোগঃ ৳{bnMoney(totals.plus)}</span> &nbsp; • &nbsp;
                    <span>বিয়োগঃ ৳{bnMoney(totals.minus)}</span>
                    <div className="font-bold text-[#163F39] mt-0.5">
                      🟰 নিট মোটঃ ৳{bnMoney(totals.net)} টাকা
                    </div>
                  </div>
                )}
                <div className="text-[10px] text-neutral-400">
                  আপডেটঃ {new Date(n.updatedAt).toLocaleDateString('bn-BD')}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Raw HTML Content */}
      {type === 'rawHtml' && data.htmlContent && (
        <div dangerouslySetInnerHTML={{ __html: data.htmlContent }} />
      )}
    </div>
  );
};
