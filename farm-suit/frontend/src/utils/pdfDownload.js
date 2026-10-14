import { salesApi } from '../api/sales';
import { purchasesApi } from '../api/purchases';
import { downloadBlob } from '../api/client';

export async function downloadSalesBillPdf(billId, billNumber) {
  try {
    const blob = await salesApi.getPdfBlob(billId);
    const filename = `FarmSuit_SalesBill_${billNumber || billId}.pdf`;
    await downloadBlob(blob, filename);
    return true;
  } catch (err) {
    console.error("Sales PDF Download failed:", err);
    throw err;
  }
}

export async function downloadPurchaseBillPdf(billId, billNumber) {
  try {
    const blob = await purchasesApi.getPdfBlob(billId);
    const filename = `FarmSuit_PurchaseBill_${billNumber || billId}.pdf`;
    await downloadBlob(blob, filename);
    return true;
  } catch (err) {
    console.error("Purchase PDF Download failed:", err);
    throw err;
  }
}

export const downloadSalesInvoicePdf = downloadSalesBillPdf;

