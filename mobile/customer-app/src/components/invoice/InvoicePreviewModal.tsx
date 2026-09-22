import React from 'react';
import {
  View,
  Text,
  Modal,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import {
  X,
  Download,
  Share2,
  Printer,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { useInvoicePreview, useDownloadInvoice, useShareInvoice, usePrintInvoice } from '../../hooks/useInvoice';
import { InvoiceReceiptCard } from './InvoiceReceiptCard';
import { SafeAreaScreen } from '../layout/SafeAreaScreen';

interface InvoicePreviewModalProps {
  visible: boolean;
  orderId: string | null;
  orderNumber?: string;
  onClose: () => void;
}

export const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({
  visible,
  orderId,
  orderNumber,
  onClose,
}) => {
  const { data: invoice, isLoading, error, refetch } = useInvoicePreview(
    visible && orderId ? orderId : undefined
  );

  const downloadMutation = useDownloadInvoice();
  const shareMutation = useShareInvoice();
  const printMutation = usePrintInvoice();

  const isBusy =
    downloadMutation.isPending ||
    shareMutation.isPending ||
    printMutation.isPending;

  const handleDownload = () => {
    if (!orderId || !invoice) return;
    downloadMutation.mutate({ orderId, invoice });
  };

  const handleShare = () => {
    if (!orderId || !invoice) return;
    shareMutation.mutate({ orderId, invoice });
  };

  const handlePrint = () => {
    if (!invoice) return;
    printMutation.mutate(invoice);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaScreen style={styles.modalScreen}>
        {/* Modal Header */}
        <View style={styles.modalHeader}>
          <View style={styles.headerLeft}>
            <View style={styles.headerIconBg}>
              <FileText size={18} color="#0284c7" />
            </View>
            <View>
              <Text style={styles.headerTitle} allowFontScaling={false}>
                Tax Invoice & Receipt
              </Text>
              <Text style={styles.headerSubtitle} allowFontScaling={false}>
                Order #{orderNumber || invoice?.orderNumber || '...'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <X size={20} color="#64748b" />
          </TouchableOpacity>
        </View>

        {/* Action Toolbar */}
        {invoice ? (
          <View style={styles.actionToolbar}>
            {/* Download Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.downloadBtn]}
              onPress={handleDownload}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {downloadMutation.isPending ? (
                <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 6 }} />
              ) : (
                <Download size={15} color="#ffffff" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.downloadBtnText} allowFontScaling={false}>
                Download PDF
              </Text>
            </TouchableOpacity>

            {/* Share Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={handleShare}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {shareMutation.isPending ? (
                <ActivityIndicator size="small" color="#0284c7" style={{ marginRight: 6 }} />
              ) : (
                <Share2 size={15} color="#0284c7" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.secondaryBtnText} allowFontScaling={false}>
                Share
              </Text>
            </TouchableOpacity>

            {/* Print Button */}
            <TouchableOpacity
              style={[styles.actionBtn, styles.secondaryBtn]}
              onPress={handlePrint}
              disabled={isBusy}
              activeOpacity={0.8}
            >
              {printMutation.isPending ? (
                <ActivityIndicator size="small" color="#0284c7" style={{ marginRight: 6 }} />
              ) : (
                <Printer size={15} color="#0284c7" style={{ marginRight: 6 }} />
              )}
              <Text style={styles.secondaryBtnText} allowFontScaling={false}>
                Print
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Modal Body */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {isLoading ? (
            <View style={styles.centerBox}>
              <ActivityIndicator size="large" color="#0284c7" />
              <Text style={styles.loadingText} allowFontScaling={false}>
                Generating tax invoice preview...
              </Text>
            </View>
          ) : error || !invoice ? (
            <View style={styles.centerBox}>
              <AlertCircle size={40} color="#ef4444" style={{ marginBottom: 10 }} />
              <Text style={styles.errorTitle} allowFontScaling={false}>
                Invoice Unavailable
              </Text>
              <Text style={styles.errorSub} allowFontScaling={false}>
                We couldn't generate the invoice preview for this order. Please try again or download the official PDF.
              </Text>
              <TouchableOpacity
                style={styles.retryBtn}
                onPress={() => refetch()}
                activeOpacity={0.8}
              >
                <RefreshCw size={14} color="#ffffff" style={{ marginRight: 6 }} />
                <Text style={styles.retryBtnText} allowFontScaling={false}>
                  Retry
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <InvoiceReceiptCard invoice={invoice} />
          )}
        </ScrollView>
      </SafeAreaScreen>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalScreen: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerIconBg: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#f0f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionToolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    gap: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 40,
    borderRadius: 10,
    paddingHorizontal: 14,
  },
  downloadBtn: {
    flex: 1.4,
    backgroundColor: '#0284c7',
  },
  downloadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  secondaryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0284c7',
  },
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    paddingVertical: 60,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 12,
    fontWeight: '500',
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  errorSub: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  retryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  retryBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#ffffff',
  },
});
