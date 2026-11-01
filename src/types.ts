export interface Row {
  date: string;
  subject: string;
  category?: string;
  price: string;
  cash: string;
  comment: string;
}

export interface Account {
  name: string;
  rows: Row[];
  filter: {
    date: string;
    keyword: string;
    category?: string;
  };
  phone: string;
}

export interface Sheet {
  name: string;
  accounts: Account[];
  activeAccountIdx: number;
  tag: string;
  phone: string;
}

export interface ShopInfo {
  name: string;
  address: string;
  phone: string;
  dailyCashTarget?: number;
  categories?: string[];
}

export const DEFAULT_CATEGORIES: string[] = [
  'পণ্য বিক্রয়',
  'কাঁচামাল',
  'দোকান ভাড়া',
  'বিদ্যুৎ বিল',
  'পরিবহন',
  'কর্মচারী বেতন',
  'অন্যান্য',
];

export interface InvoiceItem {
  subject: string;
  qty: string;
  price: string;
  comment: string;
}

export interface InvoiceDraft {
  customerName: string;
  date: string;
  items: InvoiceItem[];
  discount: string;
  vatPercent: string;
  paidNow: string;
  note: string;
  addToLedger: boolean;
  editingNo: number | null;
}

export interface Invoice {
  no: number;
  customerName: string;
  date: string;
  items: InvoiceItem[];
  discount: number;
  vatPercent: number;
  vatAmount: number;
  paidNow: number;
  note: string;
  subtotal: number;
  grandTotal: number;
  due: number;
  previousDue: number;
  totalDueAll: number;
  createdAt: number;
  editedAt?: number;
}

export interface Note {
  id: number;
  title: string;
  text: string;
  calc: boolean;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface NotifSettings {
  amountThreshold: number;
  daysThreshold: number;
}

export interface ParsedPeriod {
  type: 'date' | 'month' | 'year' | 'keyword' | 'range';
  day?: number | null;
  month?: number | null;
  year?: number | null;
  keyword?: string;
  start?: ParsedPeriod;
  end?: ParsedPeriod;
}

export type ViewSection =
  | 'ledger'
  | 'dashboard'
  | 'allView'
  | 'report'
  | 'globalSearch'
  | 'invoice'
  | 'notebook'
  | 'guide';
