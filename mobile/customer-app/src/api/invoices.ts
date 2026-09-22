import { apiClient } from './client';
import { InvoicePreview, InvoicePreviewResponse } from '../types/invoice';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { Share, Platform } from 'react-native';
import { generateInvoiceHtml } from '../utils/invoiceTemplate';
import { ENV } from '../config/env';

export const invoiceApi = {
  /**
   * Fetches structured tax invoice preview details for an order
   */
  getInvoicePreview: async (orderId: string): Promise<InvoicePreview> => {
    const response = await apiClient.get<InvoicePreviewResponse>(
      `/invoices/user/orders/${orderId}`
    );
    return response.data?.data;
  },

  /**
   * Generates a crisp, vector Tax Invoice PDF file on device storage
   */
  generatePdfFile: async (invoice: InvoicePreview): Promise<string> => {
    const html = generateInvoiceHtml(invoice);
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const invoiceName = `Invoice-${invoice.invoiceNumber || invoice.orderNumber}.pdf`.replace(/[\/\\]/g, '-');
    const newPath = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${invoiceName}`;

    try {
      await FileSystem.copyAsync({
        from: uri,
        to: newPath,
      });
      return newPath;
    } catch {
      return uri;
    }
  },

  /**
   * Downloads official backend PDF or falls back to locally generated vector PDF
   */
  downloadPdf: async (orderId: string, invoice?: InvoicePreview): Promise<string> => {
    const invoiceNum = invoice?.invoiceNumber || orderId;
    const cleanFileName = `Invoice-${invoiceNum}.pdf`.replace(/[\/\\]/g, '-');
    const targetUri = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}${cleanFileName}`;

    try {
      // Attempt downloading directly from backend API
      const downloadResult = await FileSystem.downloadAsync(
        `${ENV.API_URL}/invoices/user/orders/${orderId}/pdf`,
        targetUri,
        {
          headers: {
            'Bypass-Tunnel-Reminder': 'true',
          },
        }
      );

      if (downloadResult.status === 200) {
        return downloadResult.uri;
      }
    } catch (downloadErr) {
      console.warn('Backend PDF download error, falling back to local vector generator:', downloadErr);
    }

    // High fidelity fallback: generate local PDF
    if (invoice) {
      return await invoiceApi.generatePdfFile(invoice);
    }

    // If invoice data wasn't provided, fetch it then generate
    const freshInvoice = await invoiceApi.getInvoicePreview(orderId);
    return await invoiceApi.generatePdfFile(freshInvoice);
  },

  /**
   * Opens native system print dialog (AirPrint / Android Print Spooler)
   */
  printInvoice: async (invoice: InvoicePreview): Promise<void> => {
    const html = generateInvoiceHtml(invoice);
    await Print.printAsync({
      html,
    });
  },

  /**
   * Triggers native sharing sheet (WhatsApp, Gmail, Files, Drive, etc.)
   */
  shareInvoice: async (pdfUri: string, invoiceNumber?: string): Promise<void> => {
    const isAvailable = await Sharing.isAvailableAsync();
    if (isAvailable) {
      await Sharing.shareAsync(pdfUri, {
        mimeType: 'application/pdf',
        dialogTitle: `Share Invoice #${invoiceNumber || ''}`,
        UTI: 'com.adobe.pdf',
      });
    } else {
      await Share.share({
        title: `Invoice #${invoiceNumber || ''}`,
        message: `Here is your official tax invoice #${invoiceNumber || ''}.`,
        url: pdfUri,
      });
    }
  },
};
