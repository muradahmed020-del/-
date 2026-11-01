import React, { useState } from 'react';
import { Lock } from 'lucide-react';
import { simpleHash } from '../utils/bengali';

interface PinLockModalProps {
  isOpen: boolean;
  onSuccess: () => void;
  correctPinHash: string;
}

export const PinLockModal: React.FC<PinLockModalProps> = ({
  isOpen,
  onSuccess,
  correctPinHash,
}) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  if (!isOpen) return null;

  const handleUnlock = () => {
    if (simpleHash(pin.trim()) === correctPinHash) {
      setError(false);
      setPin('');
      onSuccess();
    } else {
      setError(true);
      setPin('');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2A251E]/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl border-t-4 border-[#C6992E] bg-white p-6 shadow-2xl text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF7F0] text-[#8C2F24]">
          <Lock className="h-6 w-6" />
        </div>
        <h2 className="font-serif-bn text-xl font-bold text-[#8C2F24]">
          হিসাবের খাতা লক করা আছে
        </h2>
        <p className="text-xs text-[#756B57]">
          চালিয়ে যেতে আপনার গোপন পিন (PIN) লিখুন
        </p>

        <input
          type="password"
          autoFocus
          value={pin}
          inputMode="numeric"
          onChange={(e) => {
            setPin(e.target.value);
            setError(false);
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
          placeholder="পিন লিখুন"
          className="w-full text-center font-mono-num text-lg tracking-widest rounded-lg border border-[#DCD1B2] bg-[#FAF7F0] px-4 py-2.5 focus:border-[#C6992E] focus:bg-white focus:outline-none"
        />

        {error && (
          <p className="text-xs font-bold text-[#8C2F24]">
            পিন ভুল হয়েছে — আবার চেষ্টা করুন
          </p>
        )}

        <button
          type="button"
          onClick={handleUnlock}
          className="w-full rounded-lg bg-[#C6992E] py-2.5 text-xs font-bold text-[#2A2210] shadow hover:bg-[#D8B968] active:scale-95 transition"
        >
          আনলক করুন
        </button>
      </div>
    </div>
  );
};
