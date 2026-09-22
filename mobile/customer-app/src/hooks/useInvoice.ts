import { useQuery, useMutation } from '@tanstack/react-query';
import { invoiceApi } from '../api/invoices';
import { InvoicePreview } from '../types/invoice';
import { Alert } from 'react-native';

export const INVOICE_QUERY_KEYS = {
  preview: (orderId: string) => ['invoice', 'preview', orderId] as const,
};

export const useInvoicePreview = (orderId?: string) => {
  return useQuery({
    queryKey: INVOICE_QUERY_KEYS.preview(orderId || ''),
    queryFn: () => invoiceApi.getInvoicePreview(orderId!),
    enabled: Boolean(orderId),
    staleTime: 5 * 60 * 1000,
  });
};

export const useDownloadInvoice = () => {
  return useMutation({
    mutationFn: async ({ orderId, invoice }: { orderId: string; invoice?: InvoicePreview }) => {
      return await invoiceApi.downloadPdf(orderId, invoice);
    },
    onSuccess: (fileUri, variables) => {
      const fileName = `Invoice-${variables.invoice?.invoiceNumber || variables.orderId}.pdf`;
      Alert.alert(
        'Invoice Downloaded',
        `Your invoice has been saved to your device:\n${fileName}`,
        [
          { text: 'OK' },
          {
            text: 'Share / Save to Files',
            onPress: () => {
              invoiceApi.shareInvoice(fileUri, variables.invoice?.invoiceNumber);
            },
          },
        ]
      );
    },
    onError: (err: any) => {
      Alert.alert(
        'Download Failed',
        err?.message || 'Unable to download invoice PDF at this time. Please try again.'
      );
    },
  });
};

export const useShareInvoice = () => {
  return useMutation({
    mutationFn: async ({ orderId, invoice }: { orderId: string; invoice: InvoicePreview }) => {
      const fileUri = await invoiceApi.downloadPdf(orderId, invoice);
      await invoiceApi.shareInvoice(fileUri, invoice.invoiceNumber);
      return fileUri;
    },
    onError: (err: any) => {
      Alert.alert(
        'Share Failed',
        err?.message || 'Unable to prepare invoice for sharing. Please try again.'
      );
    },
  });
};

export const usePrintInvoice = () => {
  return useMutation({
    mutationFn: async (invoice: InvoicePreview) => {
      await invoiceApi.printInvoice(invoice);
    },
    onError: (err: any) => {
      Alert.alert(
        'Print Error',
        err?.message || 'Unable to launch system print service. Please try again.'
      );
    },
  });
};
