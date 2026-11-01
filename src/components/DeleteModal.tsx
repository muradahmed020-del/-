import React, { useState } from 'react';

interface DeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  title,
  itemName,
  onConfirm,
  onCancel,
}) => {
  const [inputText, setInputText] = useState('');

  if (!isOpen) return null;

  const isConfirmed = inputText.trim() === 'ডিলেট';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A251E]/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-xl border-t-4 border-[#8C2F24] bg-white p-6 shadow-2xl space-y-4">
        <h3 className="font-serif-bn text-lg font-bold text-[#8C2F24]">
          {title}
        </h3>
        <p className="text-xs text-[#2A251E] leading-relaxed">
          <b>"{itemName}"</b> মুছে ফেলতে চান? এর সব তথ্য ও হিসাব হারিয়ে যাবে।
        </p>
        <p className="text-xs text-[#756B57]">
          নিশ্চিত করতে নিচে হুবহু লিখুনঃ <b className="text-[#8C2F24]">ডিলেট</b>
        </p>

        <input
          type="text"
          autoFocus
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="এখানে লিখুন"
          className="w-full rounded-lg border border-[#DCD1B2] bg-[#FAF7F0] px-3 py-2 text-sm text-[#2A251E] focus:border-[#8C2F24] focus:bg-white focus:outline-none"
        />

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={() => {
              setInputText('');
              onCancel();
            }}
            className="rounded-lg border border-[#DCD1B2] bg-white px-3 py-1.5 text-xs font-semibold text-[#756B57] hover:bg-neutral-100"
          >
            বাতিল
          </button>
          <button
            type="button"
            disabled={!isConfirmed}
            onClick={() => {
              setInputText('');
              onConfirm();
            }}
            className="rounded-lg bg-[#8C2F24] px-4 py-1.5 text-xs font-bold text-white shadow hover:bg-[#B23F30] disabled:opacity-40 disabled:cursor-not-allowed transition"
          >
            মুছে ফেলুন
          </button>
        </div>
      </div>
    </div>
  );
};
