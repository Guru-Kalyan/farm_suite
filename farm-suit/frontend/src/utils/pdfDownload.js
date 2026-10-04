import { salesApi } from '../api/sales';
import { downloadBlob } from '../api/client';

export async function downloadSalesBillPdf(billId, billNumber) {
  try {
    const blob = await salesApi.getPdfBlob(billId);
    const filename = `FarmSuit_SalesBill_${billNumber || billId}.pdf`;
    await downloadBlob(blob, filename);
    return true;
  } catch (err) {
    console.error("PDF Download failed:", err);
    throw err;
  }
}
