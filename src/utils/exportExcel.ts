// ============================================================
// Excel Export — SheetJS (xlsx)
// Exports expense log + summary sheet, shared via expo-sharing
// ============================================================
import * as XLSX from 'xlsx';
import { writeAsStringAsync, EncodingType } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Expense, Fund } from '../lib/supabaseTypes';
import { formatDate } from './formatters';

// Access cacheDirectory from the expo-file-system native module at runtime
// eslint-disable-next-line @typescript-eslint/no-var-requires
const ExpoFS = require('expo-file-system/src/ExpoFileSystem').default;
const CACHE_DIR: string = ExpoFS?.cacheDirectory ?? 'file:///tmp/';


interface ExportOptions {
  expenses: Expense[];
  funds: Fund[];
  budgetName: string;
}

export async function exportToExcel({
  expenses,
  funds,
  budgetName,
}: ExportOptions): Promise<void> {
  const workbook = XLSX.utils.book_new();

  // ── Sheet 1: Full Expense Log ─────────────────────────────
  const expenseRows = expenses.map((e) => ({
    Date: formatDate(e.date),
    Description: e.description,
    Department: e.department,
    Category: e.category,
    'Amount (₹)': e.amount,
    'Paid By': e.paid_by,
    'Payment Mode': e.payment_mode,
    Notes: e.notes ?? '',
    'Reimbursement Status': e.is_reimbursed
      ? 'Reimbursed'
      : e.is_reimbursement_pending
      ? 'Pending'
      : 'N/A',
    'Bill Attached': e.bill_url ? 'Yes' : 'No',
  }));

  const expenseSheet = XLSX.utils.json_to_sheet(expenseRows);
  expenseSheet['!cols'] = [
    { wch: 14 }, { wch: 30 }, { wch: 14 }, { wch: 16 },
    { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 30 },
    { wch: 20 }, { wch: 14 },
  ];
  XLSX.utils.book_append_sheet(workbook, expenseSheet, 'Expense Log');

  // ── Sheet 2: Summary ─────────────────────────────────────
  const summaryRows: Record<string, string | number>[] = [];

  // Total by Department
  summaryRows.push({ Section: '── By Department ──', Amount: '' });
  const byDept: Record<string, number> = {};
  expenses.forEach((e) => {
    byDept[e.department] = (byDept[e.department] ?? 0) + e.amount;
  });
  Object.entries(byDept).forEach(([dept, total]) => {
    summaryRows.push({ Section: dept, Amount: total });
  });

  summaryRows.push({ Section: '', Amount: '' });

  // Total by Category
  summaryRows.push({ Section: '── By Category ──', Amount: '' });
  const byCat: Record<string, number> = {};
  expenses.forEach((e) => {
    byCat[e.category] = (byCat[e.category] ?? 0) + e.amount;
  });
  Object.entries(byCat).forEach(([cat, total]) => {
    summaryRows.push({ Section: cat, Amount: total });
  });

  summaryRows.push({ Section: '', Amount: '' });

  // Fund Contributions
  summaryRows.push({ Section: '── Fund Contributions ──', Amount: '' });
  funds.forEach((f) => {
    summaryRows.push({
      Section: `${f.contributor_name} (${formatDate(f.date)})`,
      Amount: f.amount,
    });
  });

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  summarySheet['!cols'] = [{ wch: 30 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // ── Write + Share ─────────────────────────────────────────
  const fileName = `${budgetName.replace(/\s+/g, '_')}_Expenses.xlsx`;
  const filePath = `${CACHE_DIR}${fileName}`;

  const wbout = XLSX.write(workbook, { type: 'base64', bookType: 'xlsx' });
  await writeAsStringAsync(filePath, wbout, {
    encoding: EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType:
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: `Share ${fileName}`,
      UTI: 'com.microsoft.excel.xlsx',
    });
  }
}
