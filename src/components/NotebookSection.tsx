import React, { useState } from 'react';
import { BookOpen, Plus, Printer, Pin, Trash2, Edit3, Search, CheckSquare, Square, Calculator } from 'lucide-react';
import { Note } from '../types';
import { toBnDigits, calcNoteTotals, bnMoney } from '../utils/bengali';

interface NotebookSectionProps {
  notes: Note[];
  onClose: () => void;
  onSaveNote: (note: { id?: number; title: string; text: string; calc: boolean; pinned?: boolean }) => void;
  onDeleteNote: (id: number) => void;
  onTogglePin: (id: number) => void;
  onPrintA4: (notesToPrint: Note[]) => void;
  onPrintThermal: (notesToPrint: Note[]) => void;
}

export const NotebookSection: React.FC<NotebookSectionProps> = ({
  notes,
  onClose,
  onSaveNote,
  onDeleteNote,
  onTogglePin,
  onPrintA4,
  onPrintThermal,
}) => {
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | 'new' | null>(null);
  const [titleInput, setTitleInput] = useState('');
  const [textInput, setTextInput] = useState('');
  const [calcInput, setCalcInput] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (n.title || '').toLowerCase().includes(q) || (n.text || '').toLowerCase().includes(q);
  });

  // Sort: pinned first, then newest
  filteredNotes.sort((a, b) => {
    if (!!a.pinned !== !!b.pinned) return a.pinned ? -1 : 1;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const handleStartNew = () => {
    setEditingId('new');
    setTitleInput('');
    setTextInput('');
    setCalcInput(true);
  };

  const handleStartEdit = (note: Note) => {
    setEditingId(note.id);
    setTitleInput(note.title);
    setTextInput(note.text);
    setCalcInput(note.calc);
  };

  const handleSaveForm = (printMode?: 'a4' | 'thermal') => {
    const title = titleInput.trim();
    const text = textInput.trim();
    if (!title && !text) {
      alert('শিরোনাম অথবা নোটের কোনো লেখা লিখুন।');
      return;
    }

    const noteObj = {
      id: editingId === 'new' ? undefined : editingId || undefined,
      title: title || '(শিরোনামহীন নোট)',
      text,
      calc: calcInput,
    };

    onSaveNote(noteObj);

    if (printMode === 'a4') {
      onPrintA4([
        {
          id: noteObj.id || Date.now(),
          title: noteObj.title,
          text: noteObj.text,
          calc: noteObj.calc,
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
    } else if (printMode === 'thermal') {
      onPrintThermal([
        {
          id: noteObj.id || Date.now(),
          title: noteObj.title,
          text: noteObj.text,
          calc: noteObj.calc,
          pinned: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        },
      ]);
    }

    setEditingId(null);
  };

  const toggleSelect = (id: number) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(filteredNotes.map((n) => n.id)));
  };

  const handleClearSelection = () => {
    setSelectedIds(new Set());
  };

  const selectedNotesList = notes.filter((n) => selectedIds.has(n.id));

  // Live calculator preview
  const liveTotals = calcInput ? calcNoteTotals(textInput) : null;

  return (
    <div className="rounded-2xl border border-[#E6DFD3] bg-white shadow-xs overflow-hidden mb-6 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-[#FAF8F5] p-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0F3E36] text-white">
            <BookOpen className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-serif-bn text-lg font-bold text-[#1C1917]">
              স্মার্ট নোট বুক ও মেমো খাতা
            </h2>
            <p className="text-xs text-[#78716C]">
              স্বয়ংক্রিয় যোগ-বিয়োগ ক্যালকুলেটরসহ দৈনন্দিন হিসাব ও টুকে রাখা তথ্য
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

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#F0EAE1] bg-white p-3 sm:px-6 text-xs">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleStartNew}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition"
          >
            <Plus className="h-3.5 w-3.5" /> + নতুন নোট
          </button>
          <button
            type="button"
            disabled={filteredNotes.length === 0}
            onClick={() => onPrintA4(filteredNotes)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] px-3.5 py-1.5 text-xs font-semibold text-[#1C1917] hover:bg-white transition disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5 text-[#0F3E36]" /> সব নোট প্রিন্ট (A4)
          </button>
          <button
            type="button"
            disabled={filteredNotes.length === 0}
            onClick={() => onPrintThermal(filteredNotes)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-[#0F3E36] px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-[#0A2B25] transition disabled:opacity-40"
          >
            <Printer className="h-3.5 w-3.5" /> সব নোট থার্মাল
          </button>
        </div>

        <div className="relative min-w-[220px]">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-[#78716C]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="নোট অনুসন্ধান করুন..."
            className="w-full rounded-xl border border-[#E6DFD3] bg-[#FAF8F5] py-1.5 pl-8 pr-3 text-xs text-[#1C1917] focus:bg-white focus:outline-none"
          />
        </div>
      </div>

      {/* Multi-selection Bar */}
      {selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#E6DFD3] bg-[#F0FDF4] px-4 py-2.5 text-xs font-semibold text-emerald-800">
          <div>☑️ {toBnDigits(selectedIds.size)} টি নোট নির্বাচন করা হয়েছে</div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPrintA4(selectedNotesList)}
              className="rounded-xl bg-[#C28B1E] px-3 py-1 text-[#1C1917] font-bold shadow-2xs hover:bg-[#D4A33B]"
            >
              নির্বাচিত প্রিন্ট (A4)
            </button>
            <button
              type="button"
              onClick={() => onPrintThermal(selectedNotesList)}
              className="rounded-xl bg-[#0F3E36] px-3 py-1 text-white font-bold shadow-2xs hover:bg-[#0A2B25]"
            >
              নির্বাচিত থার্মাল
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="rounded-xl border border-[#E6DFD3] bg-white px-2.5 py-1 text-[#57534E] hover:bg-neutral-100"
            >
              বাতিল
            </button>
          </div>
        </div>
      )}

      {/* Inline Form when editing or creating */}
      {editingId !== null && (
        <div className="border-b border-[#F0EAE1] bg-[#FAF8F5] p-4 sm:p-6 space-y-3.5">
          <div className="flex items-center justify-between">
            <h3 className="font-serif-bn font-bold text-sm text-[#0F3E36]">
              {editingId === 'new' ? 'নতুন নোট প্রস্তুত করুন' : 'নোট সম্পাদনা'}
            </h3>
            <span className="text-xs text-[#78716C]">
              স্বয়ংক্রিয় ক্যালকুলেটর সুবিধা চালু রয়েছে
            </span>
          </div>

          <input
            type="text"
            value={titleInput}
            onChange={(e) => setTitleInput(e.target.value)}
            placeholder="নোটের শিরোনাম (যেমনঃ আজকের কেনাকাটা / মেমো)..."
            className="w-full rounded-xl border border-[#E6DFD3] bg-white px-3.5 py-2 text-sm font-bold text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F3E36]"
          />

          <textarea
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            placeholder="এখানে বিস্তারিত লিখুন... যেমনঃ&#10;চাল ৫০০&#10;ডাল ২৫০&#10;-১০০ ফেরত (টাকার সংখ্যা লিখলেই নিচে নিজে থেকেই যোগ-বিয়োগ সম্পন্ন হবে)"
            rows={5}
            className="w-full rounded-xl border border-[#E6DFD3] bg-white p-3.5 text-xs sm:text-sm text-[#1C1917] focus:outline-none focus:ring-2 focus:ring-[#0F3E36] leading-relaxed"
          />

          <label className="flex items-center gap-2 text-xs font-semibold text-[#0F3E36] cursor-pointer">
            <input
              type="checkbox"
              checked={calcInput}
              onChange={(e) => setCalcInput(e.target.checked)}
              className="rounded border-[#E6DFD3] text-[#0F3E36] h-4 w-4"
            />
            🧮 অটো যোগ-বিয়োগ গণনা সক্রিয় রাখুন (টাকার অংক নিজে থেকেই হিসাব হবে)
          </label>

          {/* Live calculator breakdown box */}
          {liveTotals && liveTotals.count > 0 && (
            <div className="rounded-xl border border-dashed border-emerald-600 bg-emerald-50/60 p-3.5 text-xs leading-relaxed">
              <div className="flex items-center gap-4 text-emerald-900 font-semibold">
                <span>➕ যোগফলঃ ৳{bnMoney(liveTotals.plus)}</span>
                <span>➖ বিয়োগঃ ৳{bnMoney(liveTotals.minus)}</span>
              </div>
              <div className="text-sm font-bold text-emerald-950 mt-1">
                🟰 নিট মোটঃ ৳{bnMoney(liveTotals.net)} টাকা ({toBnDigits(liveTotals.count)}টি অংক সমন্বয়)
              </div>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2.5 pt-2">
            <button
              type="button"
              onClick={() => handleSaveForm()}
              className="rounded-xl bg-[#0F3E36] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition"
            >
              💾 সেভ করুন
            </button>
            <button
              type="button"
              onClick={() => handleSaveForm('a4')}
              className="rounded-xl bg-[#C28B1E] px-4 py-2 text-xs font-bold text-[#1C1917] shadow-xs hover:bg-[#D4A33B] active:scale-95 transition flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> 🖨️ A4 প্রিন্ট ও সেভ
            </button>
            <button
              type="button"
              onClick={() => handleSaveForm('thermal')}
              className="rounded-xl bg-[#0F3E36] px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-[#0A2B25] active:scale-95 transition flex items-center gap-1.5"
            >
              <Printer className="h-3.5 w-3.5" /> 🧾 থার্মাল প্রিন্ট ও সেভ
            </button>
            <button
              type="button"
              onClick={() => setEditingId(null)}
              className="rounded-xl border border-[#E6DFD3] bg-white px-3.5 py-2 text-xs font-semibold text-[#57534E] hover:bg-[#F8F6F0] transition"
            >
              বাতিল
            </button>
          </div>
        </div>
      )}

      {/* Notes Grid Display */}
      <div className="p-4 sm:p-6">
        {filteredNotes.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#78716C]">
            {search
              ? 'অনুসন্ধানে কোনো নোট পাওয়া যায়নি'
              : 'এখনো কোনো নোট লেখা হয়নি — "+ নতুন নোট" বাটনে ক্লিক করে শুরু করুন'}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredNotes.map((note) => {
              const isSelected = selectedIds.has(note.id);
              const totals = note.calc ? calcNoteTotals(note.text) : null;

              return (
                <div
                  key={note.id}
                  className={`relative flex flex-col justify-between rounded-2xl border p-4 shadow-2xs transition-all ${
                    note.pinned
                      ? 'border-[#C28B1E] bg-[#FFFBEB]'
                      : isSelected
                      ? 'border-[#0F3E36] bg-[#F0FDF4]'
                      : 'border-[#E6DFD3] bg-white hover:border-[#D8D0C2] hover:shadow-xs'
                  }`}
                >
                  <div>
                    {/* Header with Title & Pin */}
                    <div className="flex items-start justify-between gap-2 mb-2.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <button
                          type="button"
                          onClick={() => toggleSelect(note.id)}
                          className="text-[#0F3E36] flex-shrink-0"
                        >
                          {isSelected ? (
                            <CheckSquare className="h-4 w-4" />
                          ) : (
                            <Square className="h-4 w-4 text-neutral-300" />
                          )}
                        </button>
                        <h4 className="font-serif-bn font-bold text-sm text-[#1C1917] truncate">
                          {note.title}
                        </h4>
                      </div>

                      {/* Card Actions */}
                      <div className="flex items-center gap-0.5 flex-shrink-0">
                        <button
                          type="button"
                          title={note.pinned ? 'পিন খুলুন' : 'উপরে পিন করুন'}
                          onClick={() => onTogglePin(note.id)}
                          className={`p-1 rounded-md transition ${
                            note.pinned ? 'text-[#C28B1E]' : 'text-[#78716C] hover:text-[#C28B1E]'
                          }`}
                        >
                          <Pin className="h-3.5 w-3.5 fill-current" />
                        </button>
                        <button
                          type="button"
                          title="৮০mm থার্মাল প্রিন্ট"
                          onClick={() => onPrintThermal([note])}
                          className="p-1 rounded-md text-[#0F3E36] hover:bg-black/5"
                        >
                          <Printer className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="সম্পাদনা করুন"
                          onClick={() => handleStartEdit(note)}
                          className="p-1 rounded-md text-[#57534E] hover:bg-black/5"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          title="মুছে ফেলুন"
                          onClick={() => {
                            if (confirm(`"${note.title}" নোটটি মুছে ফেলতে চান?`)) {
                              onDeleteNote(note.id);
                            }
                          }}
                          className="p-1 rounded-md text-[#991B1B] hover:bg-red-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Text Body */}
                    <p className="whitespace-pre-wrap text-xs text-[#2A251E] leading-relaxed line-clamp-6 mb-3">
                      {note.text}
                    </p>
                  </div>

                  {/* Calculator Summary at Card Bottom */}
                  <div>
                    {totals && totals.count > 0 && (
                      <div className="rounded-xl bg-[#FAF8F5] border border-[#E6DFD3] p-2.5 text-[11px] mb-2 leading-tight">
                        <div className="flex justify-between font-semibold text-emerald-800">
                          <span>যোগঃ ৳{bnMoney(totals.plus)}</span>
                          {totals.minus > 0 && (
                            <span className="text-[#991B1B]">বিয়োগঃ ৳{bnMoney(totals.minus)}</span>
                          )}
                        </div>
                        <div className="font-bold text-[#1C1917] mt-1 pt-1 border-t border-[#F0EAE1]">
                          🟰 নিট মোটঃ ৳{bnMoney(totals.net)} টাকা
                        </div>
                      </div>
                    )}

                    <div className="text-[10px] text-[#78716C]">
                      আপডেটঃ{' '}
                      {new Date(note.updatedAt).toLocaleDateString('bn-BD', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
