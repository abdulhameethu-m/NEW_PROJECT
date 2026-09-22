import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ChevronLeft,
  Download,
  Share2,
  Printer,
  FileText,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../../components/layout/SafeAreaScreen';
import { useInvoicePreview, useDownloadInvoice, useShareInvoice, usePrintInvoice } from '../../../hooks/useInvoice';
import { InvoiceReceiptCard } from '../../../components/invoice/InvoiceReceiptCard';
import { safeGoBack } from '../../../utils/safeNavigation';

export default function OrderInvoiceScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();

  const {
    data: invoice,
    isLoading,
    isRefetching,
    error,
    refetch,
  } = useInvoicePreview(id);

  const downloadMutation = useDownloadInvoice();
  const shareMutation = useShareInvoice();
  const printMutation = usePrintInvoice();

  const isBusy =
    downloadMutation.isPending ||
    shareMutation.isPending ||
    printMutation.isPending;

  const handleDownload = () => {
    if (!id || !invoice) return;
    downloadMutation.mutate({ orderId: id, invoice });
  };

  const handleShare = () => {
    if (!id || !invoice) return;
    shareMutation.mutate({ orderId: id, invoice });
  };

  const handlePrint = () => {
    if (!invoice) return;
    printMutation.mutate(invoice);
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Screen Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, `/orders/${id}`)}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={24} color="#0f172a" />
        </TouchableOpacity>

        <View style={styles.headerTitleCol}>
          <Text style={styles.headerTitle} allowFontScaling={false}>
            Tax Invoice & Receipt
          </Text>
          <Text style={styles.headerSubtitle} allowFontScaling={false}>
            Order #{invoice?.orderNumber || id?.slice(-6).toUpperCase() || ''}
          </Text>
        </View>

        {invoice ? (
          <TouchableOpacity
            style={styles.headerActionBtn}
            onPress={handleShare}
            disabled={isBusy}
            activeOpacity={0.7}
          >
            <Share2 size={18} color="#0284c7" />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 38 }} />
        )}
      </View>

      {/* Action Toolbar */}
      {invoice ? (
        <View style={styles.actionToolbar}>
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

      {/* Main Scroll Content */}
      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentInner}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#0284c7']}
            tintColor="#0284c7"
          />
        }
      >
        {isLoading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color="#0284c7" />
            <Text style={styles.loadingText} allowFontScaling={false}>
              Loading tax invoice & receipt...
            </Text>
          </View>
        ) : error || !invoice ? (
          <View style={styles.centerBox}>
            <AlertCircle size={44} color="#ef4444" style={{ marginBottom: 12 }} />
            <Text style={styles.errorTitle} allowFontScaling={false}>
              Invoice Not Available
            </Text>
            <Text style={styles.errorSub} allowFontScaling={false}>
              Unable to load invoice details for this order. It might still be processing or unavailable.
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
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f1f5f9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  headerTitleCol: {
    flex: 1,
    alignItems: 'center',
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
  headerActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#bae6fd',
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
  content: {
    flex: 1,
  },
  contentInner: {
    padding: 16,
    paddingBottom: 40,
  },
  centerBox: {
    paddingVertical: 80,
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
    fontSize: 17,
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
