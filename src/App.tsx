import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { Sheet, ShopInfo, Invoice, Note, ViewSection, NotifSettings, Row, DEFAULT_CATEGORIES } from './types';
import { HeaderCover } from './components/HeaderCover';
import { CustomerSidebar } from './components/CustomerSidebar';
import { LedgerTable } from './components/LedgerTable';
import { DashboardView } from './components/DashboardView';
import { AllSheetsView } from './components/AllSheetsView';
import { ReportSection } from './components/ReportSection';
import { GlobalSearchSection } from './components/GlobalSearchSection';
import { InvoiceSection } from './components/InvoiceSection';
import { NotebookSection } from './components/NotebookSection';
import { GuideSection } from './components/GuideSection';
import { PinLockModal } from './components/PinLockModal';
import { DeleteModal } from './components/DeleteModal';
import { PrintContainer, PrintData } from './components/PrintContainer';
import {
  todayDMY,
  fmt,
  due,
  toIntlPhone,
  parsePeriodQuery,
  rowMatchesPeriod,
  periodLabel,
  toBnDigits,
  parseRowDate,
  formatInvoiceNo,
} from './utils/bengali';
import {
  buildWorkbook,
  parseWorkbookIntoSheets,
  parseNotesFromWorkbook,
  emptyRow,
  DEFAULT_ACCOUNT_NAME,
} from './utils/excel';
import { printThermalHtml } from './utils/thermal';

const LS_KEY = 'hisaber_khata_autosave_v1';
const LS_BACKUP_KEY = 'hisaber_khata_last_backup_v1';
const PIN_KEY = 'hisaber_khata_pin_v1';
const UNLOCK_SESSION_KEY = 'hisaber_khata_unlocked_v1';
const NOTIF_SETTINGS_KEY = 'hisaber_khata_notif_settings_v1';

export default function App() {
  // Initialize default sheet
  const createDefaultSheet = (name: string): Sheet => ({
    name,
    accounts: [
      {
        name: DEFAULT_ACCOUNT_NAME,
        rows: [{ date: todayDMY(), subject: '', price: '', cash: '', comment: '' }],
        filter: { date: '', keyword: '' },
        phone: '',
      },
    ],
    activeAccountIdx: 0,
    tag: '',
    phone: '',
  });

  // Load Initial State from LocalStorage
  const [sheets, setSheets] = useState<Sheet[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.sheets) && saved.sheets.length > 0) {
          return saved.sheets.map((s: any) => ({
            name: s.name || 'গ্রাহক',
            accounts: Array.isArray(s.accounts) && s.accounts.length > 0 ? s.accounts : [
              {
                name: DEFAULT_ACCOUNT_NAME,
                rows: Array.isArray(s.rows) && s.rows.length > 0 ? s.rows : [emptyRow()],
                filter: { date: '', keyword: '' },
                phone: s.phone || '',
              },
            ],
            activeAccountIdx: typeof s.activeAccountIdx === 'number' ? s.activeAccountIdx : 0,
            tag: s.tag || '',
            phone: s.phone || '',
          }));
        }
      }
    } catch {
      // fallback
    }
    return [createDefaultSheet('গ্রাহক ১')];
  });

  const [activeIdx, setActiveIdx] = useState<number>(0);
  const [shopInfo, setShopInfo] = useState<ShopInfo>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved.shopInfo) {
          return {
            ...saved.shopInfo,
            categories:
              Array.isArray(saved.shopInfo.categories) && saved.shopInfo.categories.length > 0
                ? saved.shopInfo.categories
                : DEFAULT_CATEGORIES,
          };
        }
      }
    } catch {}
    return { name: '', address: '', phone: '', categories: DEFAULT_CATEGORIES };
  });

  const [receiptSeq, setReceiptSeq] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (typeof saved.receiptSeq === 'number') return saved.receiptSeq;
      }
    } catch {}
    return 0;
  });

  const [invoices, setInvoices] = useState<Invoice[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.invoices)) return saved.invoices;
      }
    } catch {}
    return [];
  });

  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (Array.isArray(saved.notes)) return saved.notes;
      }
    } catch {}
    return [];
  });

  const [currentSection, setCurrentSection] = useState<ViewSection>('dashboard');
  const [periodQuery, setPeriodQuery] = useState('');
  const [autosaveStatus, setAutosaveStatus] = useState<{ text: string; type: 'saved' | 'saving' | 'error' | '' }>({
    text: 'ব্রাউজারে অটো-সেভ সক্রিয়',
    type: 'saved',
  });

  const [lastBackupDays, setLastBackupDays] = useState<number | null>(() => {
    try {
      const raw = localStorage.getItem(LS_BACKUP_KEY);
      if (raw) {
        const ts = parseInt(raw, 10);
        return Math.floor((Date.now() - ts) / (1000 * 60 * 60 * 24));
      }
    } catch {}
    return null;
  });

  const [notifSettings, setNotifSettings] = useState<NotifSettings>(() => {
    try {
      const raw = localStorage.getItem(NOTIF_SETTINGS_KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { amountThreshold: 3000, daysThreshold: 20 };
  });

  // PIN Lock State
  const [pinHash, setPinHash] = useState<string | null>(() => localStorage.getItem(PIN_KEY));
  const [isUnlocked, setIsUnlocked] = useState<boolean>(() => {
    if (!localStorage.getItem(PIN_KEY)) return true;
    return sessionStorage.getItem(UNLOCK_SESSION_KEY) === '1';
  });

  // Print Data State
  const [printData, setPrintData] = useState<PrintData | null>(null);

  // Delete Modal State
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    itemName: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    itemName: '',
    onConfirm: () => {},
  });

  // Undo / Redo stacks
  const undoStack = useRef<string[]>([]);
  const redoStack = useRef<string[]>([]);

  const pushSnapshot = useCallback(() => {
    const snap = JSON.stringify({ sheets, activeIdx });
    undoStack.current.push(snap);
    if (undoStack.current.length > 60) undoStack.current.shift();
    redoStack.current = [];
  }, [sheets, activeIdx]);

  const handleUndo = useCallback(() => {
    if (undoStack.current.length === 0) return;
    const currentSnap = JSON.stringify({ sheets, activeIdx });
    redoStack.current.push(currentSnap);
    const prev = JSON.parse(undoStack.current.pop()!);
    setSheets(prev.sheets);
    setActiveIdx(Math.min(prev.activeIdx, prev.sheets.length - 1));
    setAutosaveStatus({ text: 'আগের অবস্থায় ফিরিয়ে আনা হয়েছে (Ctrl+Z)', type: 'saved' });
  }, [sheets, activeIdx]);

  const handleRedo = useCallback(() => {
    if (redoStack.current.length === 0) return;
    const currentSnap = JSON.stringify({ sheets, activeIdx });
    undoStack.current.push(currentSnap);
    const next = JSON.parse(redoStack.current.pop()!);
    setSheets(next.sheets);
    setActiveIdx(Math.min(next.activeIdx, next.sheets.length - 1));
    setAutosaveStatus({ text: 'পুনরায় করা হয়েছে (Ctrl+Y)', type: 'saved' });
  }, [sheets, activeIdx]);

  // Hidden File Input Refs
  const excelInputRef = useRef<HTMLInputElement>(null);
  const jsonInputRef = useRef<HTMLInputElement>(null);

  // Autosave to LocalStorage every 5 seconds or when state changes
  useEffect(() => {
    setAutosaveStatus({ text: 'সেভ হচ্ছে…', type: 'saving' });
    const timer = setTimeout(() => {
      try {
        localStorage.setItem(
          LS_KEY,
          JSON.stringify({
            sheets,
            activeIdx,
            shopInfo,
            receiptSeq,
            invoices,
            notes,
            savedAt: Date.now(),
          })
        );
        const timeStr = new Date().toLocaleTimeString('bn-BD', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
        setAutosaveStatus({ text: `ব্রাউজারে সেভ হয়েছে — ${timeStr}`, type: 'saved' });
      } catch (err) {
        console.error('LocalStorage save failed:', err);
        setAutosaveStatus({ text: 'সেভ করতে সমস্যা হয়েছে', type: 'error' });
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [sheets, activeIdx, shopInfo, receiptSeq, invoices, notes]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();

      if (mod) {
        if (key === 'z' && !e.shiftKey) {
          e.preventDefault();
          handleUndo();
        } else if (key === 'y' || (key === 'z' && e.shiftKey)) {
          e.preventDefault();
          handleRedo();
        } else if (key === 's') {
          e.preventDefault();
          handleExportExcel();
        }
      } else if (e.altKey) {
        if (key === 'n') {
          e.preventDefault();
          handleAddCustomer();
        } else if (key === 'r') {
          e.preventDefault();
          handleAddRowAtTop();
        } else if (key === 'g') {
          e.preventDefault();
          setCurrentSection((prev) => (prev === 'globalSearch' ? 'ledger' : 'globalSearch'));
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // Calculate Notif Items
  const notifItems = useMemo(() => {
    const items: Array<{
      sIdx: number;
      aIdx: number;
      customerName: string;
      accountName: string;
      multi: boolean;
      due: number;
      daysSince: number | null;
      isHigh: boolean;
      isOld: boolean;
    }> = [];

    sheets.forEach((sheet, sIdx) => {
      sheet.accounts.forEach((acc, aIdx) => {
        let accDue = 0;
        let lastDate: Date | null = null;
        acc.rows.forEach((r) => {
          const d = due(r);
          if (d !== '') accDue += d;
          const parsed = parseRowDate(r.date);
          if (parsed && parsed.year && parsed.month && parsed.day) {
            const cur = new Date(parsed.year, parsed.month - 1, parsed.day);
            if (!lastDate || cur > lastDate) lastDate = cur;
          }
        });

        if (accDue > 0.5) {
          let daysSince: number | null = null;
          if (lastDate) {
            const now = new Date();
            now.setHours(0, 0, 0, 0);
            const targetTime = (lastDate as Date).getTime();
            daysSince = Math.round((now.getTime() - targetTime) / (1000 * 60 * 60 * 24));
          }
          const isHigh = accDue >= notifSettings.amountThreshold;
          const isOld = daysSince != null && daysSince >= notifSettings.daysThreshold;

          if (isHigh || isOld) {
            items.push({
              sIdx,
              aIdx,
              customerName: sheet.name,
              accountName: acc.name,
              multi: sheet.accounts.length > 1,
              due: accDue,
              daysSince,
              isHigh,
              isOld,
            });
          }
        }
      });
    });

    items.sort((a, b) => b.due - a.due);
    return items;
  }, [sheets, notifSettings]);

  // Customer Management Handlers
  const handleAddCustomer = () => {
    const name = prompt('নতুন কাস্টমারের নাম লিখুন:');
    if (!name || !name.trim()) return;
    pushSnapshot();
    const newSheet = createDefaultSheet(name.trim());
    setSheets([newSheet, ...sheets]);
    setActiveIdx(0);
    setCurrentSection('ledger');
  };

  const handleDeleteCustomer = (index: number) => {
    if (sheets.length <= 1) {
      alert('অন্তত একজন কাস্টমার থাকতেই হবে।');
      return;
    }
    const customer = sheets[index];
    setDeleteModal({
      isOpen: true,
      title: 'কাস্টমার মুছুন',
      itemName: customer.name,
      onConfirm: () => {
        pushSnapshot();
        const nextSheets = sheets.filter((_, i) => i !== index);
        setSheets(nextSheets);
        setActiveIdx(Math.max(0, index - 1));
        setDeleteModal({ isOpen: false, title: '', itemName: '', onConfirm: () => {} });
      },
    });
  };

  const handleUpdatePhone = (index: number, phone: string) => {
    pushSnapshot();
    const next = [...sheets];
    next[index] = { ...next[index], phone };
    setSheets(next);
  };

  const handleUpdateTag = (index: number, tag: string) => {
    pushSnapshot();
    const next = [...sheets];
    next[index] = { ...next[index], tag };
    setSheets(next);
  };

  const handleUpdateSheetName = (newName: string) => {
    pushSnapshot();
    const next = [...sheets];
    next[activeIdx] = { ...next[activeIdx], name: newName || 'গ্রাহক' };
    setSheets(next);
  };

  // Sub-account Management Handlers
  const handleAddAccount = () => {
    const name = prompt('নতুন হিসাবের নাম লিখুন (যেমনঃ বাকির হিসাব, নগদ হিসাব, মালামাল):');
    if (!name || !name.trim()) return;
    pushSnapshot();
    const next = [...sheets];
    const customer = next[activeIdx];
    customer.accounts.push({
      name: name.trim(),
      rows: [emptyRow()],
      filter: { date: '', keyword: '' },
      phone: customer.phone || '',
    });
    customer.activeAccountIdx = customer.accounts.length - 1;
    setSheets(next);
  };

  const handleRenameAccount = (aIdx: number, newName: string) => {
    pushSnapshot();
    const next = [...sheets];
    next[activeIdx].accounts[aIdx].name = newName;
    setSheets(next);
  };

  const handleDeleteAccount = (aIdx: number) => {
    const customer = sheets[activeIdx];
    if (customer.accounts.length <= 1) {
      alert('অন্তত একটি হিসাব থাকতেই হবে।');
      return;
    }
    setDeleteModal({
      isOpen: true,
      title: 'হিসাব মুছুন',
      itemName: `${customer.name} — ${customer.accounts[aIdx].name}`,
      onConfirm: () => {
        pushSnapshot();
        const next = [...sheets];
        next[activeIdx].accounts = customer.accounts.filter((_, i) => i !== aIdx);
        next[activeIdx].activeAccountIdx = Math.max(0, aIdx - 1);
        setSheets(next);
        setDeleteModal({ isOpen: false, title: '', itemName: '', onConfirm: () => {} });
      },
    });
  };

  const handleUpdateAccountRows = (rows: Row[]) => {
    const next = [...sheets];
    const curSheet = next[activeIdx];
    const curAcc = curSheet.accounts[curSheet.activeAccountIdx || 0];
    curAcc.rows = rows;
    setSheets(next);
  };

  const handleAddRowAtTop = () => {
    const next = [...sheets];
    const curSheet = next[activeIdx];
    const curAcc = curSheet.accounts[curSheet.activeAccountIdx || 0];
    curAcc.rows = [
      { date: curAcc.rows[0]?.date || todayDMY(), subject: '', price: '', cash: '', comment: '' },
      ...curAcc.rows,
    ];
    setSheets(next);
  };

  // WhatsApp reminder message builder
  const handleSendDueReminder = (sIdx: number, aIdx: number) => {
    const sheet = sheets[sIdx];
    if (!sheet) return;
    const account = sheet.accounts[aIdx];
    if (!account) return;

    let dueAmount = 0;
    account.rows.forEach((r) => {
      const d = due(r);
      if (d !== '') dueAmount += d;
    });

    const multi = sheet.accounts.length > 1;
    let phone = (account.phone || sheet.phone || '').trim();

    if (!phone) {
      const entered = prompt(
        `"${sheet.name}" এর ${multi ? `"${account.name}" হিসাবের ` : ''}WhatsApp/মোবাইল নম্বর লিখুন:`,
        ''
      );
      if (!entered || !entered.trim()) return;
      phone = entered.trim();
      pushSnapshot();
      if (multi) account.phone = phone;
      else sheet.phone = phone;
      setSheets([...sheets]);
    }

    const intl = toIntlPhone(phone);
    if (!intl) {
      alert('সঠিক ফোন নম্বর পাওয়া যায়নি।');
      return;
    }

    const shopTitle = (shopInfo.name || '').trim();
    const lines = [
      `প্রিয় ${sheet.name},`,
      '',
      multi
        ? `আপনার "${account.name}" হিসাবে বর্তমানে বকেয়া বাকি আছেঃ ৳${fmt(dueAmount)} টাকা।`
        : `আপনার হিসাবের খাতায় বর্তমানে বকেয়া বাকি আছেঃ ৳${fmt(dueAmount)} টাকা।`,
      'অনুগ্রহ করে সুবিধামতো সময়ে পরিশোধ করবেন।',
      '',
      shopTitle ? `ধন্যবাদান্তে,\n${shopTitle}` : 'ধন্যবাদান্তে',
    ];

    window.open(`https://wa.me/${intl}?text=${encodeURIComponent(lines.join('\n'))}`, '_blank');
  };

  const handleSendAllDueReminders = () => {
    const dueAccounts: Array<{ sIdx: number; aIdx: number; name: string }> = [];
    sheets.forEach((s, sIdx) => {
      s.accounts.forEach((acc, aIdx) => {
        let accDue = 0;
        acc.rows.forEach((r) => {
          const d = due(r);
          if (d !== '') accDue += d;
        });
        if (accDue > 0.5) {
          dueAccounts.push({ sIdx, aIdx, name: `${s.name}${s.accounts.length > 1 ? ` (${acc.name})` : ''}` });
        }
      });
    });

    if (dueAccounts.length === 0) {
      alert('কোনো হিসাবে বাকি নেই।');
      return;
    }

    if (
      !confirm(
        `মোট ${toBnDigits(dueAccounts.length)} টি বকেয়া হিসাব পাওয়া গেছে। একে একে প্রতিটি কাস্টমারের WhatsApp চ্যাট ওপেন করা হবে। শুরু করবেন?`
      )
    )
      return;

    dueAccounts.forEach((item, idx) => {
      setTimeout(() => {
        handleSendDueReminder(item.sIdx, item.aIdx);
      }, idx * 1000);
    });
  };

  // Mark Account Paid (adds today's entry with received cash equal to current due)
  const handleMarkAccountPaid = (sIdx: number, aIdx: number) => {
    const sheet = sheets[sIdx];
    if (!sheet) return;
    const account = sheet.accounts[aIdx];
    if (!account) return;

    let accDue = 0;
    account.rows.forEach((r) => {
      const d = due(r);
      if (d !== '') accDue += d;
    });

    if (accDue <= 0.5) {
      alert('এই হিসাবে বর্তমানে কোনো বকেয়া বাকি নেই।');
      return;
    }

    if (
      !confirm(
        `"${sheet.name}" এর ${sheet.accounts.length > 1 ? `"${account.name}" ` : ''}হিসাবের মোট বকেয়া ৳${fmt(
          accDue
        )} টাকা "পরিশোধ হয়েছে" হিসেবে মার্ক করবেন?`
      )
    )
      return;

    pushSnapshot();
    const next = [...sheets];
    const targetAccount = next[sIdx].accounts[aIdx];
    targetAccount.rows = [
      {
        date: todayDMY(),
        subject: 'বাকি পরিশোধ',
        price: '',
        cash: String(accDue),
        comment: 'সম্পূর্ণ বাকি পরিশোধ করা হয়েছে',
      },
      ...targetAccount.rows,
    ];
    setSheets(next);
  };

  // Custom Categories
  const categories = useMemo(() => {
    if (Array.isArray(shopInfo.categories) && shopInfo.categories.length > 0) {
      return shopInfo.categories;
    }
    return DEFAULT_CATEGORIES;
  }, [shopInfo.categories]);

  const handleAddCategory = (newCat: string) => {
    const trimmed = newCat.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) return;
    pushSnapshot();
    setShopInfo((prev) => ({
      ...prev,
      categories: [...(prev.categories || DEFAULT_CATEGORIES), trimmed],
    }));
  };

  const handleDeleteCategory = (catToDelete: string) => {
    pushSnapshot();
    setShopInfo((prev) => ({
      ...prev,
      categories: (prev.categories || DEFAULT_CATEGORIES).filter((c) => c !== catToDelete),
    }));
  };

  // Excel Export
  const handleExportExcel = () => {
    try {
      const wb = buildWorkbook(sheets, notes);
      const stamp = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(wb, `হিসাবের_খাতা_${stamp}.xlsx`);
      setAutosaveStatus({ text: 'এক্সেল ফাইল ডাউনলোড সম্পন্ন হয়েছে', type: 'saved' });
    } catch (err) {
      console.error(err);
      alert('এক্সেল ফাইল তৈরিতে সমস্যা হয়েছে।');
    }
  };

  // Excel Import
  const handleImportExcelFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array' });
        const importedSheets = parseWorkbookIntoSheets(wb);
        const importedNotes = parseNotesFromWorkbook(wb);

        if (importedSheets.length === 0 && (!importedNotes || importedNotes.length === 0)) {
          alert('এই ফাইলে হিসাবের খাতার কোনো ডেটা পাওয়া যায়নি।');
          return;
        }

        pushSnapshot();
        if (importedSheets.length > 0) {
          setSheets(importedSheets);
          setActiveIdx(0);
        }
        if (importedNotes && importedNotes.length > 0) {
          setNotes(importedNotes);
        }

        alert(
          `সফলভাবে ইমপোর্ট হয়েছেঃ ${toBnDigits(importedSheets.length)} জন কাস্টমার${
            importedNotes ? ` এবং ${toBnDigits(importedNotes.length)} টি নোট` : ''
          }!`
        );
        setCurrentSection('ledger');
      } catch (err) {
        console.error(err);
        alert('এক্সেল ফাইলটি পড়তে সমস্যা হয়েছে। সঠিক ফাইল ফরম্যাট কিনা দেখুন।');
      }
      e.target.value = '';
    };
    reader.readAsArrayBuffer(file);
  };

  // JSON Full Backup
  const handleBackupJson = () => {
    try {
      const data = {
        app: 'hisaber_khata_backup',
        version: 1,
        exportedAt: Date.now(),
        sheets,
        activeIdx,
        shopInfo,
        receiptSeq,
        invoices,
        notes,
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const stamp = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `হিসাব_সম্পূর্ণ_ব্যাকআপ_${stamp}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      const now = Date.now();
      localStorage.setItem(LS_BACKUP_KEY, String(now));
      setLastBackupDays(0);
      setAutosaveStatus({ text: 'সম্পূর্ণ JSON ব্যাকআপ ডাউনলোড হয়েছে', type: 'saved' });
    } catch (err) {
      console.error(err);
      alert('ব্যাকআপ তৈরিতে সমস্যা হয়েছে।');
    }
  };

  // JSON Restore
  const handleRestoreJsonFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const parsed = JSON.parse(evt.target?.result as string);
        if (!parsed || !Array.isArray(parsed.sheets) || parsed.sheets.length === 0) {
          alert('এটি সঠিক হিসাবের খাতা ব্যাকআপ ফাইল নয়।');
          return;
        }

        if (!confirm('এই ব্যাকআপ ফাইলটি থেকে রিস্টোর করলে বর্তমান সব তথ্য প্রতিস্থাপিত হবে। এগিয়ে যাবেন?')) {
          return;
        }

        pushSnapshot();
        setSheets(parsed.sheets);
        setActiveIdx(parsed.activeIdx || 0);
        if (parsed.shopInfo) setShopInfo(parsed.shopInfo);
        if (typeof parsed.receiptSeq === 'number') setReceiptSeq(parsed.receiptSeq);
        if (Array.isArray(parsed.invoices)) setInvoices(parsed.invoices);
        if (Array.isArray(parsed.notes)) setNotes(parsed.notes);

        alert('ব্যাকআপ থেকে তথ্য সফলভাবে ফিরিয়ে আনা হয়েছে!');
        setCurrentSection('ledger');
      } catch (err) {
        console.error(err);
        alert('ব্যাকআপ ফাইলটি পড়তে সমস্যা হয়েছে।');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  };

  // PIN Lock Management
  const handleManagePin = () => {
    if (!pinHash) {
      const p1 = prompt('একটি ৪ বা তার বেশি অঙ্কের নতুন পিন কোড লিখুন:');
      if (!p1 || p1.trim().length < 4) {
        if (p1 !== null) alert('পিন কোড কমপক্ষে ৪ অক্ষরের হতে হবে।');
        return;
      }
      const p2 = prompt('নিশ্চিত করতে আবার একই পিন কোড লিখুন:');
      if (p1.trim() !== (p2 || '').trim()) {
        alert('দুইবার একই পিন লেখা হয়নি।');
        return;
      }
      const hash = btoa(p1.trim());
      localStorage.setItem(PIN_KEY, hash);
      sessionStorage.setItem(UNLOCK_SESSION_KEY, '1');
      setPinHash(hash);
      setIsUnlocked(true);
      alert('পিন লক সফলভাবে চালু হয়েছে!');
    } else {
      const entered = prompt('বর্তমান পিন কোড লিখুন:');
      if (!entered || btoa(entered.trim()) !== pinHash) {
        if (entered !== null) alert('ভুল পিন কোড!');
        return;
      }
      const change = confirm('নতুন পিন সেট করতে "OK" চাপুন।\nপিন লক পুরোপুরি বন্ধ করতে "Cancel" চাপুন।');
      if (change) {
        const p1 = prompt('নতুন পিন কোড লিখুন (কমপক্ষে ৪ অক্ষর):');
        if (!p1 || p1.trim().length < 4) return;
        const p2 = prompt('আবার নতুন পিনটি লিখুন:');
        if (p1.trim() !== (p2 || '').trim()) {
          alert('পিন দুটি মেলেনি।');
          return;
        }
        const hash = btoa(p1.trim());
        localStorage.setItem(PIN_KEY, hash);
        setPinHash(hash);
        alert('পিন সফলভাবে পরিবর্তন করা হয়েছে!');
      } else {
        localStorage.removeItem(PIN_KEY);
        sessionStorage.removeItem(UNLOCK_SESSION_KEY);
        setPinHash(null);
        setIsUnlocked(true);
        alert('পিন লক বন্ধ করা হয়েছে।');
      }
    }
  };

  // Standard Print Trigger
  const triggerPrint = (data: PrintData) => {
    setPrintData(data);
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const currentSheet = sheets[activeIdx] || sheets[0];
  const currentAccount = currentSheet?.accounts[currentSheet.activeAccountIdx || 0] || currentSheet?.accounts[0];

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col justify-between">
      {/* Hidden File Inputs */}
      <input
        ref={excelInputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={handleImportExcelFile}
      />
      <input
        ref={jsonInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleRestoreJsonFile}
      />

      {/* PIN Lock Screen if locked */}
      {!isUnlocked && pinHash && (
        <PinLockModal
          isOpen={!isUnlocked}
          correctPinHash={pinHash}
          onSuccess={() => {
            sessionStorage.setItem(UNLOCK_SESSION_KEY, '1');
            setIsUnlocked(true);
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      <DeleteModal
        isOpen={deleteModal.isOpen}
        title={deleteModal.title}
        itemName={deleteModal.itemName}
        onConfirm={deleteModal.onConfirm}
        onCancel={() => setDeleteModal({ isOpen: false, title: '', itemName: '', onConfirm: () => {} })}
      />

      {/* Printable Paper Layout */}
      <PrintContainer data={printData} />

      <div>
        {/* Header Cover Banner */}
        <HeaderCover
          sheets={sheets}
          shopInfo={shopInfo}
          onUpdateShopInfo={setShopInfo}
          autosaveStatus={autosaveStatus}
          lastBackupDays={lastBackupDays}
          currentSection={currentSection}
          onSelectSection={setCurrentSection}
          onExportExcel={handleExportExcel}
          onImportExcelClick={() => excelInputRef.current?.click()}
          onBackupJson={handleBackupJson}
          onRestoreJsonClick={() => jsonInputRef.current?.click()}
          onManagePin={handleManagePin}
          hasPin={!!pinHash}
          onPrintSummary={() => {
            const p = parsePeriodQuery(periodQuery);
            triggerPrint({
              type: 'allSummary',
              shopInfo,
              sheets,
              periodLabel: periodLabel(p),
            });
          }}
          onPrintAllDetail={() => {
            const p = parsePeriodQuery(periodQuery);
            triggerPrint({
              type: 'allDetail',
              shopInfo,
              sheets,
              periodLabel: periodLabel(p),
            });
          }}
          periodQuery={periodQuery}
          onPeriodQueryChange={setPeriodQuery}
          notifItems={notifItems}
          notifSettings={notifSettings}
          onUpdateNotifSettings={(s) => {
            setNotifSettings(s);
            localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(s));
          }}
          onSelectCustomerAccount={(sIdx, aIdx) => {
            setActiveIdx(sIdx);
            const next = [...sheets];
            next[sIdx].activeAccountIdx = aIdx;
            setSheets(next);
            setCurrentSection('ledger');
          }}
        />

        {/* Dynamic Full-Width Sections */}
        {currentSection === 'dashboard' && (
          <DashboardView
            sheets={sheets}
            dailyCashTarget={shopInfo.dailyCashTarget || 10000}
            onUpdateDailyTarget={(newTarget) => {
              setShopInfo((prev) => ({ ...prev, dailyCashTarget: newTarget }));
            }}
            onClose={() => setCurrentSection('ledger')}
            onSelectCustomer={(sIdx, aIdx) => {
              setActiveIdx(sIdx);
              const next = [...sheets];
              next[sIdx].activeAccountIdx = aIdx;
              setSheets(next);
              setCurrentSection('ledger');
            }}
            onSendDueReminder={handleSendDueReminder}
            onMarkAccountPaid={handleMarkAccountPaid}
          />
        )}

        {currentSection === 'allView' && (
          <AllSheetsView
            sheets={sheets}
            onClose={() => setCurrentSection('ledger')}
            onPrintA4={(period, mode) => {
              triggerPrint({
                type: mode === 'summary' ? 'allSummary' : 'allDetail',
                shopInfo,
                sheets,
                periodLabel: periodLabel(period),
              });
            }}
            onPrintThermal={(period, mode) => {
              const html = `
                <div class="t-center t-bold t-lg">${shopInfo.name || 'হিসাবের খাতা'}</div>
                <div class="t-center t-bold">${mode === 'summary' ? 'সব শীটের সারসংক্ষেপ' : 'সব শীটের বিস্তারিত'}</div>
                <div class="t-dashed"></div>
                ${sheets
                  .map((s) => {
                    let p = 0;
                    let c = 0;
                    let d = 0;
                    s.accounts.forEach((acc) => {
                      acc.rows.forEach((r) => {
                        if (period && !rowMatchesPeriod(r, period)) return;
                        p += parseFloat(r.price) || 0;
                        c += parseFloat(r.cash) || 0;
                        const du = due(r);
                        if (du !== '') d += du;
                      });
                    });
                    return `<div class="t-item">
                      <div class="t-bold">${s.name}</div>
                      <div class="t-row"><span>মূল্যঃ ৳${fmt(p)}</span><span>নগদঃ ৳${fmt(c)}</span></div>
                      <div class="t-row t-bold"><span>বাকিঃ ৳${fmt(d)}</span></div>
                    </div>`;
                  })
                  .join('')}
              `;
              printThermalHtml(html);
            }}
          />
        )}

        {currentSection === 'report' && (
          <ReportSection
            sheets={sheets}
            onClose={() => setCurrentSection('ledger')}
            onSendDueReminder={handleSendDueReminder}
            onSendAllDueReminders={handleSendAllDueReminders}
            onMarkAccountPaid={handleMarkAccountPaid}
            onPrintReportA4={(html) => triggerPrint({ type: 'rawHtml', shopInfo, htmlContent: html })}
            onPrintReportThermal={(html) => printThermalHtml(html)}
          />
        )}

        {currentSection === 'globalSearch' && (
          <GlobalSearchSection
            sheets={sheets}
            onClose={() => setCurrentSection('ledger')}
            onSelectResult={(sIdx, aIdx) => {
              setActiveIdx(sIdx);
              const next = [...sheets];
              next[sIdx].activeAccountIdx = aIdx;
              setSheets(next);
              setCurrentSection('ledger');
            }}
          />
        )}

        {currentSection === 'invoice' && (
          <InvoiceSection
            sheets={sheets}
            invoices={invoices}
            onClose={() => setCurrentSection('ledger')}
            onSaveInvoice={(invoice, addToLedger) => {
              pushSnapshot();
              const existingIdx = invoices.findIndex((i) => i.no === invoice.no);
              if (existingIdx > -1) {
                const nextInvs = [...invoices];
                nextInvs[existingIdx] = invoice;
                setInvoices(nextInvs);
              } else {
                setInvoices([invoice, ...invoices]);
              }

              if (addToLedger) {
                let sIdx = sheets.findIndex(
                  (s) => s.name.trim().toLowerCase() === invoice.customerName.trim().toLowerCase()
                );
                const nextSheets = [...sheets];
                if (sIdx === -1) {
                  const newSheet = createDefaultSheet(invoice.customerName);
                  nextSheets.unshift(newSheet);
                  sIdx = 0;
                }
                const targetCustomer = nextSheets[sIdx];
                const targetAccount = targetCustomer.accounts[0];
                const itemsSubj = invoice.items.map((it) => it.subject).filter(Boolean).join(', ');
                targetAccount.rows = [
                  {
                    date: invoice.date,
                    subject: `ইনভয়েস #${formatInvoiceNo(invoice.no)}${itemsSubj ? ` (${itemsSubj})` : ''}`,
                    price: String(invoice.grandTotal),
                    cash: String(invoice.paidNow),
                    comment: invoice.note,
                  },
                  ...targetAccount.rows,
                ];
                setSheets(nextSheets);
              }
            }}
            onDeleteInvoice={(no) => {
              pushSnapshot();
              setInvoices(invoices.filter((i) => i.no !== no));
            }}
            onPrintA4={(invoice) => triggerPrint({ type: 'invoice', shopInfo, invoice })}
            onPrintThermal={(invoice) => {
              const html = `
                <div class="t-center t-bold t-lg">${shopInfo.name || 'আমাদের প্রতিষ্ঠান'}</div>
                ${shopInfo.address ? `<div class="t-center">${shopInfo.address}</div>` : ''}
                ${shopInfo.phone ? `<div class="t-center">ফোনঃ ${shopInfo.phone}</div>` : ''}
                <div class="t-dashed"></div>
                <div class="t-row"><span>ইনভয়েস নংঃ</span><span>#${formatInvoiceNo(invoice.no)}</span></div>
                <div class="t-row"><span>তারিখঃ</span><span>${invoice.date}</span></div>
                <div class="t-row"><span>কাস্টমারঃ</span><span>${invoice.customerName}</span></div>
                <div class="t-dashed"></div>
                ${invoice.items
                  .map(
                    (it) => `
                  <div class="t-item">
                    <div class="t-bold">${it.subject}</div>
                    <div class="t-row"><span>${it.qty} × ৳${fmt(it.price)}</span><span>৳${fmt(
                      parseFloat(it.qty) * parseFloat(it.price)
                    )}</span></div>
                  </div>`
                  )
                  .join('')}
                <div class="t-dashed"></div>
                <div class="t-row"><span>সাব-টোটালঃ</span><span>৳${fmt(invoice.subtotal)}</span></div>
                ${invoice.discount ? `<div class="t-row"><span>ছাড়ঃ</span><span>-৳${fmt(invoice.discount)}</span></div>` : ''}
                ${invoice.vatAmount ? `<div class="t-row"><span>ভ্যাট (${invoice.vatPercent}%):</span><span>+৳${fmt(invoice.vatAmount)}</span></div>` : ''}
                <div class="t-row t-bold"><span>সর্বমোটঃ</span><span>৳${fmt(invoice.grandTotal)}</span></div>
                <div class="t-row"><span>নগদ প্রাপ্তঃ</span><span>৳${fmt(invoice.paidNow)}</span></div>
                <div class="t-row t-bold"><span>বাকিঃ</span><span>৳${fmt(invoice.due)}</span></div>
                ${
                  invoice.previousDue > 0
                    ? `<div class="t-dashed"></div>
                   <div class="t-row"><span>পূর্বের বাকিঃ</span><span>৳${fmt(invoice.previousDue)}</span></div>
                   <div class="t-row t-bold"><span>মোট বকেয়াঃ</span><span>৳${fmt(invoice.totalDueAll)}</span></div>`
                    : ''
                }
                <div class="t-dashed"></div>
                ${invoice.note ? `<div class="t-note">মন্তব্যঃ ${invoice.note}</div>` : ''}
                <div class="t-center t-thanks">ধন্যবাদ, আবার আসবেন! 🙏</div>
              `;
              printThermalHtml(html);
            }}
          />
        )}

        {currentSection === 'notebook' && (
          <NotebookSection
            notes={notes}
            onClose={() => setCurrentSection('ledger')}
            onSaveNote={(noteData) => {
              pushSnapshot();
              if (noteData.id) {
                setNotes(
                  notes.map((n) =>
                    n.id === noteData.id
                      ? { ...n, title: noteData.title, text: noteData.text, calc: noteData.calc, updatedAt: Date.now() }
                      : n
                  )
                );
              } else {
                const newNote: Note = {
                  id: Date.now(),
                  title: noteData.title,
                  text: noteData.text,
                  calc: noteData.calc,
                  pinned: false,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                setNotes([newNote, ...notes]);
              }
            }}
            onDeleteNote={(id) => {
              pushSnapshot();
              setNotes(notes.filter((n) => n.id !== id));
            }}
            onTogglePin={(id) => {
              pushSnapshot();
              setNotes(notes.map((n) => (n.id === id ? { ...n, pinned: !n.pinned } : n)));
            }}
            onPrintA4={(notesToPrint) => triggerPrint({ type: 'notes', shopInfo, notes: notesToPrint })}
            onPrintThermal={(notesToPrint) => {
              const html = `
                <div class="t-center t-bold t-lg">${shopInfo.name || 'হিসাবের খাতা'}</div>
                <div class="t-center t-bold">নোট বুক মেমো</div>
                <div class="t-dashed"></div>
                ${notesToPrint
                  .map(
                    (n) => `
                  <div class="t-note-block">
                    <div class="t-bold">${n.pinned ? '📌 ' : ''}${n.title}</div>
                    <div class="t-pre">${n.text}</div>
                    <div class="t-small">${new Date(n.updatedAt).toLocaleDateString('bn-BD')}</div>
                  </div>
                  <div class="t-dashed"></div>`
                  )
                  .join('')}
              `;
              printThermalHtml(html);
            }}
          />
        )}

        {currentSection === 'guide' && <GuideSection onClose={() => setCurrentSection('ledger')} />}

        {/* Main 2-Column Ledger Layout (Sidebar + Ledger Table) */}
        {currentSection === 'ledger' && currentSheet && (
          <div className="flex flex-col md:flex-row items-start gap-4">
            <CustomerSidebar
              sheets={sheets}
              activeIdx={activeIdx}
              onSelectCustomer={(idx) => setActiveIdx(idx)}
              onAddCustomer={handleAddCustomer}
              onDeleteCustomer={handleDeleteCustomer}
              onUpdatePhone={handleUpdatePhone}
              onUpdateTag={handleUpdateTag}
            />

            <LedgerTable
              sheet={currentSheet}
              activeAccountIdx={currentSheet.activeAccountIdx || 0}
              categories={categories}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onSelectAccount={(aIdx) => {
                const next = [...sheets];
                next[activeIdx].activeAccountIdx = aIdx;
                setSheets(next);
              }}
              onAddAccount={handleAddAccount}
              onRenameAccount={handleRenameAccount}
              onDeleteAccount={handleDeleteAccount}
              onUpdateAccountPhone={(aIdx, phone) => {
                pushSnapshot();
                const next = [...sheets];
                next[activeIdx].accounts[aIdx].phone = phone;
                setSheets(next);
              }}
              onUpdateSheetName={handleUpdateSheetName}
              onUpdateRows={handleUpdateAccountRows}
              onPrintSheetA4={() => {
                triggerPrint({
                  type: 'sheet',
                  shopInfo,
                  sheet: currentSheet,
                  account: currentAccount,
                });
              }}
              onPrintSheetThermal={() => {
                let tp = 0;
                let tc = 0;
                let td = 0;
                const rows = currentAccount.rows.filter((r) => r.subject || r.price || r.cash);
                const html = `
                  <div class="t-center t-bold t-lg">${shopInfo.name || 'হিসাবের খাতা'}</div>
                  <div class="t-center t-bold">${currentSheet.name} (${currentAccount.name})</div>
                  <div class="t-dashed"></div>
                  ${rows
                    .map((r, i) => {
                      const p = parseFloat(r.price) || 0;
                      const c = parseFloat(r.cash) || 0;
                      const d = due(r);
                      tp += p;
                      tc += c;
                      if (d !== '') td += d;
                      return `
                    <div class="t-item">
                      <div class="t-bold">${toBnDigits(i + 1)}. ${r.subject}${r.category ? ` [${r.category}]` : ''}</div>
                      <div class="t-row"><span>${r.date}</span><span>মূল্যঃ ৳${fmt(r.price)}</span></div>
                      <div class="t-row"><span>নগদঃ ৳${fmt(r.cash)}</span><span class="t-bold">বাকিঃ ৳${fmt(
                        d
                      )}</span></div>
                    </div>`;
                    })
                    .join('')}
                  <div class="t-dashed"></div>
                  <div class="t-row t-bold"><span>মোট মূল্যঃ</span><span>৳${fmt(tp)}</span></div>
                  <div class="t-row"><span>মোট নগদঃ</span><span>৳${fmt(tc)}</span></div>
                  <div class="t-row t-bold"><span>মোট বাকিঃ</span><span>৳${fmt(td)}</span></div>
                `;
                printThermalHtml(html);
              }}
              onPrintReceiptA4={() => {
                const nextSeq = receiptSeq + 1;
                setReceiptSeq(nextSeq);
                triggerPrint({
                  type: 'receipt',
                  shopInfo,
                  sheet: currentSheet,
                  account: currentAccount,
                  receiptNo: nextSeq,
                });
              }}
              onPrintReceiptThermal={() => {
                const nextSeq = receiptSeq + 1;
                setReceiptSeq(nextSeq);
                let tp = 0;
                let tc = 0;
                let td = 0;
                const rows = currentAccount.rows.filter((r) => r.subject || r.price || r.cash);
                const html = `
                  <div class="t-center t-bold t-lg">${shopInfo.name || 'রশিদ'}</div>
                  ${shopInfo.address ? `<div class="t-center">${shopInfo.address}</div>` : ''}
                  ${shopInfo.phone ? `<div class="t-center">ফোনঃ ${shopInfo.phone}</div>` : ''}
                  <div class="t-dashed"></div>
                  <div class="t-row"><span>রশিদ নংঃ</span><span>#${toBnDigits(nextSeq)}</span></div>
                  <div class="t-row"><span>তারিখঃ</span><span>${todayDMY()}</span></div>
                  <div class="t-row"><span>গ্রাহকঃ</span><span>${currentSheet.name}</span></div>
                  <div class="t-dashed"></div>
                  ${rows
                    .map((r) => {
                      const p = parseFloat(r.price) || 0;
                      const c = parseFloat(r.cash) || 0;
                      const d = due(r);
                      tp += p;
                      tc += c;
                      if (d !== '') td += d;
                      return `
                    <div class="t-item">
                      <div class="t-bold">${r.subject}</div>
                      <div class="t-row"><span>মূল্যঃ ৳${fmt(r.price)}</span><span>নগদঃ ৳${fmt(r.cash)}</span></div>
                    </div>`;
                    })
                    .join('')}
                  <div class="t-dashed"></div>
                  <div class="t-row t-bold"><span>মোট মূল্যঃ</span><span>৳${fmt(tp)}</span></div>
                  <div class="t-row"><span>নগদ প্রাপ্তঃ</span><span>৳${fmt(tc)}</span></div>
                  <div class="t-row t-bold"><span>সর্বমোট বাকিঃ</span><span>৳${fmt(td)}</span></div>
                  <div class="t-dashed"></div>
                  <div class="t-center t-thanks">ধন্যবাদান্তে</div>
                `;
                printThermalHtml(html);
              }}
              onPrintAllReceiptA4={() => {
                const nextSeq = receiptSeq + 1;
                setReceiptSeq(nextSeq);
                triggerPrint({
                  type: 'combinedReceipt',
                  shopInfo,
                  sheet: currentSheet,
                  receiptNo: nextSeq,
                });
              }}
              onPrintAllReceiptThermal={() => {
                const nextSeq = receiptSeq + 1;
                setReceiptSeq(nextSeq);
                let tp = 0;
                let tc = 0;
                let td = 0;
                const html = `
                  <div class="t-center t-bold t-lg">${shopInfo.name || 'রশিদ'}</div>
                  <div class="t-dashed"></div>
                  <div class="t-row"><span>রশিদ নংঃ</span><span>#${toBnDigits(nextSeq)}</span></div>
                  <div class="t-row"><span>গ্রাহকঃ</span><span>${currentSheet.name} (সব হিসাব)</span></div>
                  <div class="t-dashed"></div>
                  ${currentSheet.accounts
                    .map(
                      (acc) => `
                    <div class="t-bold text-[#1F5C53]">[${acc.name}]</div>
                    ${acc.rows
                      .filter((r) => r.subject || r.price || r.cash)
                      .map((r) => {
                        const p = parseFloat(r.price) || 0;
                        const c = parseFloat(r.cash) || 0;
                        const d = due(r);
                        tp += p;
                        tc += c;
                        if (d !== '') td += d;
                        return `<div class="t-row"><span>${r.subject}</span><span>৳${fmt(r.price)}</span></div>`;
                      })
                      .join('')}`
                    )
                    .join('')}
                  <div class="t-dashed"></div>
                  <div class="t-row t-bold"><span>মোট মূল্যঃ</span><span>৳${fmt(tp)}</span></div>
                  <div class="t-row"><span>মোট নগদঃ</span><span>৳${fmt(tc)}</span></div>
                  <div class="t-row t-bold"><span>মোট বাকিঃ</span><span>৳${fmt(td)}</span></div>
                `;
                printThermalHtml(html);
              }}
              onSendAccountReminder={(aIdx) => handleSendDueReminder(activeIdx, aIdx)}
              onMarkAccountPaid={() => handleMarkAccountPaid(activeIdx, currentSheet.activeAccountIdx || 0)}
            />
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-8 text-center text-xs text-[#78716C] py-5 border-t border-[#E6DFD3]">
        <p>
          হিসাবের খাতা © {toBnDigits(new Date().getFullYear())} — ব্রাউজারে নিরাপদ ও অটো-সেভ করা ডিজিটাল লেজার ও বাকি খাতা
        </p>
      </footer>
    </div>
  );
}
