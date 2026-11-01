import React, { useState, useMemo } from 'react';
import { Plus, Search, Tag, Phone, Trash2, Smartphone, ArrowDownUp, Check } from 'lucide-react';
import { Sheet } from '../types';
import { due, parseRowDate, fmt } from '../utils/bengali';

interface CustomerSidebarProps {
  sheets: Sheet[];
  activeIdx: number;
  onSelectCustomer: (index: number) => void;
  onAddCustomer: () => void;
  onDeleteCustomer: (index: number) => void;
  onUpdatePhone: (index: number, phone: string) => void;
  onUpdateTag: (index: number, tag: string) => void;
}

export const CustomerSidebar: React.FC<CustomerSidebarProps> = ({
  sheets,
  activeIdx,
  onSelectCustomer,
  onAddCustomer,
  onDeleteCustomer,
  onUpdatePhone,
  onUpdateTag,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState('');
  const [sortMode, setSortMode] = useState<'' | 'name' | 'due' | 'recent'>('');

  // Collect all unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    sheets.forEach((s) => {
      if (s.tag && s.tag.trim()) set.add(s.tag.trim());
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'bn'));
  }, [sheets]);

  // Calculate customer dues for display & sorting
  const customerDues = useMemo(() => {
    const map = new Map<number, number>();
    sheets.forEach((s, idx) => {
      let total = 0;
      s.accounts.forEach((acc) => {
        acc.rows.forEach((r) => {
          const d = due(r);
          if (d !== '') total += d;
        });
      });
      map.set(idx, total);
    });
    return map;
  }, [sheets]);

  // Calculate most recent transaction score for sorting
  const customerRecentScores = useMemo(() => {
    const map = new Map<number, number>();
    sheets.forEach((s, idx) => {
      let best = -1;
      s.accounts.forEach((acc) => {
        acc.rows.forEach((r) => {
          const parsed = parseRowDate(r.date);
          if (parsed && parsed.year) {
            const score = parsed.year * 10000 + (parsed.month || 0) * 100 + (parsed.day || 0);
            if (score > best) best = score;
          }
        });
      });
      map.set(idx, best);
    });
    return map;
  }, [sheets]);

  // Filter and sort customer indices
  const filteredIndices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const tag = selectedTag.trim();
    const list: number[] = [];

    sheets.forEach((s, i) => {
      const nameMatch = !q || s.name.toLowerCase().includes(q) || (s.phone && s.phone.includes(q));
      const tagMatch = !tag || (s.tag || '').trim() === tag;
      if (nameMatch && tagMatch) {
        list.push(i);
      }
    });

    if (sortMode === 'name') {
      list.sort((a, b) => sheets[a].name.localeCompare(sheets[b].name, 'bn'));
    } else if (sortMode === 'due') {
      list.sort((a, b) => (customerDues.get(b) || 0) - (customerDues.get(a) || 0));
    } else if (sortMode === 'recent') {
      list.sort((a, b) => (customerRecentScores.get(b) || 0) - (customerRecentScores.get(a) || 0));
    }

    return list;
  }, [sheets, searchQuery, selectedTag, sortMode, customerDues, customerRecentScores]);

  // Avatar color generator based on name
  const getAvatarColor = (name: string) => {
    const colors = [
      'bg-emerald-100 text-emerald-800',
      'bg-amber-100 text-amber-800',
      'bg-blue-100 text-blue-800',
      'bg-rose-100 text-rose-800',
      'bg-teal-100 text-teal-800',
      'bg-indigo-100 text-indigo-800',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  return (
    <aside className="w-full md:w-72 lg:w-80 flex-shrink-0 flex flex-col rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden">
      {/* Top Header & Actions */}
      <div className="p-3.5 border-b border-[#F0EAE1] bg-[#FAF8F5] space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="font-serif-bn font-bold text-sm text-[#1C1917]">
            গ্রাহক তালিকা ({filteredIndices.length})
          </span>
          <button
            type="button"
            onClick={onAddCustomer}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition"
          >
            <Plus className="h-3.5 w-3.5" /> নতুন গ্রাহক
          </button>
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-[#78716C]" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="নাম বা মোবাইল নম্বর খুঁজুন..."
            className="w-full rounded-xl border border-[#E6DFD3] bg-white py-1.5 pl-9 pr-3 text-xs text-[#1C1917] placeholder-[#78716C] focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
          />
        </div>

        {/* Filters and Sorting bar */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          {allTags.length > 0 ? (
            <select
              value={selectedTag}
              onChange={(e) => setSelectedTag(e.target.value)}
              className="rounded-lg border border-[#E6DFD3] bg-white px-2 py-1 text-xs text-[#57534E] focus:outline-none"
            >
              <option value="">সব ট্যাগ</option>
              {allTags.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          ) : (
            <div className="text-[11px] text-[#78716C] flex items-center">
              <span>ট্যাগ নেই</span>
            </div>
          )}

          <select
            value={sortMode}
            onChange={(e) => setSortMode(e.target.value as any)}
            className="rounded-lg border border-[#E6DFD3] bg-white px-2 py-1 text-xs text-[#57534E] focus:outline-none"
          >
            <option value="">যোগের ক্রম</option>
            <option value="name">নাম (অ-আ)</option>
            <option value="due">বেশি বাকি</option>
            <option value="recent">সাম্প্রতিক</option>
          </select>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex-1 overflow-y-auto max-h-[60vh] md:max-h-[70vh] p-2 space-y-1 divide-y divide-[#F0EAE1]">
        {filteredIndices.length === 0 ? (
          <div className="py-12 text-center text-xs text-[#78716C]">
            কোনো গ্রাহক পাওয়া যায়নি
          </div>
        ) : (
          filteredIndices.map((idx) => {
            const customer = sheets[idx];
            const isActive = idx === activeIdx;
            const dueAmt = customerDues.get(idx) || 0;
            const initialChar = customer.name.trim().charAt(0) || 'গ';
            const avatarStyle = getAvatarColor(customer.name);

            return (
              <div
                key={idx}
                onClick={() => onSelectCustomer(idx)}
                className={`group relative flex items-center justify-between rounded-xl p-2.5 text-xs cursor-pointer transition-all ${
                  isActive
                    ? 'bg-[#F3EFE6] text-[#0F3E36] font-bold shadow-2xs ring-1 ring-[#0F3E36]/10'
                    : 'text-[#1C1917] hover:bg-[#FAF8F5]'
                }`}
              >
                {/* Left: Avatar + Details */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full font-serif-bn font-bold text-xs flex-shrink-0 ${avatarStyle}`}
                  >
                    {initialChar}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="truncate font-semibold">{customer.name}</span>
                      {customer.tag && (
                        <span className="rounded-md bg-[#0F3E36]/10 px-1.5 py-0.2 text-[10px] text-[#0F3E36] font-medium truncate max-w-[65px]">
                          {customer.tag}
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#78716C] truncate mt-0.5">
                      {customer.phone ? `📱 ${customer.phone}` : `${customer.accounts.length}টি হিসাব`}
                    </div>
                  </div>
                </div>

                {/* Right: Due Amount & Action icons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="text-right">
                    <div
                      className={`font-mono-num font-bold text-xs ${
                        dueAmt > 0 ? 'text-[#991B1B]' : 'text-[#78716C]'
                      }`}
                    >
                      {dueAmt > 0 ? `৳${fmt(dueAmt)}` : 'পরিশোধিত'}
                    </div>
                  </div>

                  {/* Hover Actions */}
                  <div
                    className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      title={customer.phone ? `ফোনঃ ${customer.phone}` : 'মোবাইল নম্বর যোগ করুন'}
                      onClick={() => {
                        const res = prompt(
                          `"${customer.name}" এর WhatsApp/মোবাইল নম্বর লিখুন:`,
                          customer.phone || ''
                        );
                        if (res !== null) onUpdatePhone(idx, res.trim());
                      }}
                      className="p-1 rounded-md text-[#78716C] hover:bg-black/5 hover:text-[#0F3E36]"
                    >
                      {customer.phone ? (
                        <Smartphone className="h-3.5 w-3.5 text-emerald-700" />
                      ) : (
                        <Phone className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      type="button"
                      title="ট্যাগ বা গ্রুপ বদলান"
                      onClick={() => {
                        const res = prompt(
                          `"${customer.name}" এর ট্যাগ/গ্রুপ লিখুন (যেমনঃ পাইকারি, খুচরা):`,
                          customer.tag || ''
                        );
                        if (res !== null) onUpdateTag(idx, res.trim());
                      }}
                      className="p-1 rounded-md text-[#78716C] hover:bg-black/5 hover:text-[#C28B1E]"
                    >
                      <Tag className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="কাস্টমার মুছুন"
                      onClick={() => onDeleteCustomer(idx)}
                      className="p-1 rounded-md text-[#78716C] hover:bg-red-50 hover:text-[#991B1B]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </aside>
  );
};
