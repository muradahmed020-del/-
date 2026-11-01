import React from 'react';
import { HelpCircle, Key, Save, Undo, RefreshCw, Smartphone } from 'lucide-react';

interface GuideSectionProps {
  onClose: () => void;
}

export const GuideSection: React.FC<GuideSectionProps> = ({ onClose }) => {
  return (
    <div className="rounded-xl border border-[#DCD1B2] bg-white shadow-lg overflow-hidden mb-6 animate-in fade-in duration-200">
      <div className="h-1 bg-[#C6992E]" />
      <div className="flex items-center justify-between border-b border-[#DCD1B2] bg-[#FAF7F0] p-4">
        <h2 className="font-serif-bn text-lg sm:text-xl font-bold text-[#8C2F24] flex items-center gap-2">
          <HelpCircle className="h-5 w-5" /> 📘 ব্যবহারের গাইড ও কিবোর্ড শর্টকাট
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-[#DCD1B2] bg-white px-3 py-1.5 text-xs font-semibold text-[#756B57] hover:bg-neutral-100"
        >
          ✕ বন্ধ করুন
        </button>
      </div>

      <div className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
        {/* Autosave Card */}
        <div className="rounded-xl border border-[#DCD1B2] bg-[#FAF7F0] p-4 space-y-2">
          <h3 className="font-serif-bn font-bold text-sm text-[#1F5C53] flex items-center gap-2">
            <Save className="h-4 w-4" /> 🗂️ ব্রাউজারে অটো-সেভ
          </h3>
          <p className="text-[#2A251E] leading-relaxed">
            সব হিসাব-নিকাশ এই ব্রাউজারে প্রতি ৫ সেকেন্ডে নিজে থেকেই সেভ হতে থাকে। কম্পিউটার বন্ধ করলেও বা পেজ রিলোড দিলেও তথ্য মুছে যাবে না।
          </p>
        </div>

        {/* Undo Redo */}
        <div className="rounded-xl border border-[#DCD1B2] bg-[#FAF7F0] p-4 space-y-2">
          <h3 className="font-serif-bn font-bold text-sm text-[#1F5C53] flex items-center gap-2">
            <Undo className="h-4 w-4" /> ↩️ ভুল হলে ফিরিয়ে আনা (Undo)
          </h3>
          <p className="text-[#2A251E] leading-relaxed">
            ভুলে কোনো কিছু মুছে গেলে বা ভুল লিখলে <b>Ctrl + Z</b> চাপুন — শেষ পরিবর্তনটি সাথে সাথে ফিরে আসবে। পুনরায় করতে চাইলে <b>Ctrl + Y</b>।
          </p>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="rounded-xl border border-[#DCD1B2] bg-[#FAF7F0] p-4 space-y-2">
          <h3 className="font-serif-bn font-bold text-sm text-[#8C2F24] flex items-center gap-2">
            <Key className="h-4 w-4" /> ⌨️ কিবোর্ড শর্টকাট
          </h3>
          <div className="space-y-1.5 font-mono-num text-[11px]">
            <div className="flex justify-between border-b border-[#DCD1B2] pb-1">
              <span className="font-bold text-[#1F5C53]">Alt + N</span>
              <span className="text-[#2A251E]">নতুন কাস্টমার যোগ</span>
            </div>
            <div className="flex justify-between border-b border-[#DCD1B2] pb-1">
              <span className="font-bold text-[#1F5C53]">Alt + R</span>
              <span className="text-[#2A251E]">নতুন এন্ট্রি সারি</span>
            </div>
            <div className="flex justify-between border-b border-[#DCD1B2] pb-1">
              <span className="font-bold text-[#1F5C53]">Alt + F</span>
              <span className="text-[#2A251E]">কাস্টমার খোঁজা</span>
            </div>
            <div className="flex justify-between border-b border-[#DCD1B2] pb-1">
              <span className="font-bold text-[#1F5C53]">Alt + G</span>
              <span className="text-[#2A251E]">সব হিসাবে অনুসন্ধান</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-[#1F5C53]">Ctrl + S</span>
              <span className="text-[#2A251E]">এক্সেল সেভ / ডাউনলোড</span>
            </div>
          </div>
        </div>

        {/* Excel Backup */}
        <div className="rounded-xl border border-[#DCD1B2] bg-[#FAF7F0] p-4 space-y-2">
          <h3 className="font-serif-bn font-bold text-sm text-[#1F5C53] flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> 💾 স্থায়ী এক্সেল ও JSON কপি
          </h3>
          <p className="text-[#2A251E] leading-relaxed">
            অন্য কম্পিউটারে নিতে বা সম্পূর্ণ নিরাপত্তা নিশ্চিত করতে মাঝে মাঝে <b>"⇩ এক্সেল ফাইল হিসেবে সেভ করুন"</b> বা <b>"সম্পূর্ণ ব্যাকআপ (JSON)"</b> চেপে ডাউনলোড করে রাখুন।
          </p>
        </div>

        {/* WhatsApp Reminder */}
        <div className="rounded-xl border border-[#DCD1B2] bg-[#FAF7F0] p-4 space-y-2">
          <h3 className="font-serif-bn font-bold text-sm text-[#1F5C53] flex items-center gap-2">
            <Smartphone className="h-4 w-4" /> 📲 WhatsApp বাকির তাগাদা
          </h3>
          <p className="text-[#2A251E] leading-relaxed">
            কাস্টমারের নামের পাশে মোবাইল নম্বর লিখুন। বকেয়া হলে এক ক্লিকেই সুন্দর বাংলা তাগাদা মেসেজ সহ হোয়াটসঅ্যাপ চ্যাট ওপেন হবে।
          </p>
        </div>

        {/* Auto Bengali Numerals */}
        <div className="rounded-xl border border-[#DCD1B2] bg-[#FAF7F0] p-4 space-y-2">
          <h3 className="font-serif-bn font-bold text-sm text-[#1F5C53] flex items-center gap-2">
            <span>০-৯</span> বাংলা ও ইংরেজি সংখ্যা
          </h3>
          <p className="text-[#2A251E] leading-relaxed">
            ইনপুট ফিল্ডে বাংলা সংখ্যা (যেমনঃ ১২৫০) অথবা ইংরেজি সংখ্যা (1250) যাই লিখুন না কেন, অটো-স্বয়ংক্রিয়ভাবে সঠিক হিসাব ও রূপান্তর সম্পন্ন হয়।
          </p>
        </div>
      </div>
    </div>
  );
};
