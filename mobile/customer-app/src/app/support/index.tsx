import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  ChevronLeft,
  Plus,
  Search,
  HelpCircle,
  MessageSquare,
  ShieldCheck,
  AlertCircle,
  X,
  LogIn,
} from 'lucide-react-native';
import { SafeAreaScreen } from '../../components/layout/SafeAreaScreen';
import { safeGoBack } from '../../utils/safeNavigation';
import { useAuthStore } from '../../stores/authStore';
import { useSupportTickets } from '../../hooks/useSupport';
import { SUPPORT_FAQS } from '../../constants/supportFaqs';
import { SupportFaqAccordion } from '../../components/support/SupportFaqAccordion';
import { SupportContactCard } from '../../components/support/SupportContactCard';
import { SupportTicketCard } from '../../components/support/SupportTicketCard';

export default function SupportCenterScreen() {
  const router = useRouter();
  const { status: authStatus } = useAuthStore();
  const isAuthenticated = authStatus === 'AUTHENTICATED';

  // Navigation tab state: 'faqs' | 'tickets'
  const [activeTab, setActiveTab] = useState<'faqs' | 'tickets'>('faqs');

  // FAQs state
  const [faqSearch, setFaqSearch] = useState('');
  const [selectedFaqCategory, setSelectedFaqCategory] = useState<string>('All');

  // Tickets state
  const [ticketFilter, setTicketFilter] = useState<'ALL' | 'ACTIVE' | 'RESOLVED'>('ALL');

  // Queries
  const {
    data: tickets = [],
    isLoading: isTicketsLoading,
    isRefetching: isTicketsRefetching,
    refetch: refetchTickets,
  } = useSupportTickets();

  // Active tickets count
  const openTicketsCount = useMemo(() => {
    return tickets.filter((t) => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length;
  }, [tickets]);

  // Filtered FAQs
  const faqCategories = useMemo(() => {
    const cats = Array.from(new Set(SUPPORT_FAQS.map((f) => f.category)));
    return ['All', ...cats];
  }, []);

  const filteredFaqs = useMemo(() => {
    return SUPPORT_FAQS.filter((f) => {
      const matchesCategory = selectedFaqCategory === 'All' || f.category === selectedFaqCategory;
      const query = faqSearch.trim().toLowerCase();
      const matchesQuery =
        !query ||
        f.question.toLowerCase().includes(query) ||
        f.answer.toLowerCase().includes(query);
      return matchesCategory && matchesQuery;
    });
  }, [faqSearch, selectedFaqCategory]);

  // Filtered Tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      if (ticketFilter === 'ACTIVE') {
        return t.status === 'OPEN' || t.status === 'IN_PROGRESS';
      }
      if (ticketFilter === 'RESOLVED') {
        return t.status === 'RESOLVED' || t.status === 'CLOSED';
      }
      return true;
    });
  }, [tickets, ticketFilter]);

  const handleRaiseTicketPress = () => {
    if (!isAuthenticated) {
      router.push('/(auth)/login' as any);
      return;
    }
    router.push('/support/new' as any);
  };

  return (
    <SafeAreaScreen style={styles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => safeGoBack(router, '/(tabs)/profile')}
          style={styles.backBtn}
          activeOpacity={0.7}
        >
          <ChevronLeft size={22} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} allowFontScaling={false}>
          Support Center
        </Text>
        <TouchableOpacity
          onPress={handleRaiseTicketPress}
          style={styles.newTicketBtn}
          activeOpacity={0.8}
        >
          <Plus size={16} color="#ffffff" style={{ marginRight: 4 }} />
          <Text style={styles.newTicketBtnText} allowFontScaling={false}>
            Raise Ticket
          </Text>
        </TouchableOpacity>
      </View>

      {/* Main Switcher Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'faqs' && styles.tabItemActive]}
          onPress={() => setActiveTab('faqs')}
          activeOpacity={0.7}
        >
          <HelpCircle
            size={16}
            color={activeTab === 'faqs' ? '#4f46e5' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[styles.tabLabel, activeTab === 'faqs' && styles.tabLabelActive]}
            allowFontScaling={false}
          >
            FAQ & Contact
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'tickets' && styles.tabItemActive]}
          onPress={() => setActiveTab('tickets')}
          activeOpacity={0.7}
        >
          <MessageSquare
            size={16}
            color={activeTab === 'tickets' ? '#4f46e5' : '#64748b'}
            style={{ marginRight: 6 }}
          />
          <Text
            style={[styles.tabLabel, activeTab === 'tickets' && styles.tabLabelActive]}
            allowFontScaling={false}
          >
            My Tickets
          </Text>
          {openTicketsCount > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText} allowFontScaling={false}>
                {openTicketsCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Body Content */}
      {activeTab === 'faqs' ? (
        <ScrollView
          style={styles.contentScroll}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Direct Support Channels */}
          <SupportContactCard />

          {/* Search FAQ */}
          <View style={styles.searchBar}>
            <Search size={18} color="#94a3b8" style={{ marginRight: 8 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search help questions, topics..."
              placeholderTextColor="#94a3b8"
              value={faqSearch}
              onChangeText={setFaqSearch}
              clearButtonMode="while-editing"
            />
            {faqSearch.length > 0 && (
              <TouchableOpacity onPress={() => setFaqSearch('')} style={styles.clearBtn}>
                <X size={14} color="#64748b" />
              </TouchableOpacity>
            )}
          </View>

          {/* Category Chips */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.chipsScroll}
            contentContainerStyle={styles.chipsContent}
          >
            {faqCategories.map((cat) => {
              const isSelected = selectedFaqCategory === cat;
              return (
                <TouchableOpacity
                  key={cat}
                  style={[styles.chip, isSelected && styles.chipActive]}
                  onPress={() => setSelectedFaqCategory(cat)}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[styles.chipText, isSelected && styles.chipTextActive]}
                    allowFontScaling={false}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* FAQ List */}
          <View style={styles.faqSectionHeader}>
            <Text style={styles.faqSectionTitle} allowFontScaling={false}>
              Frequently Asked Questions ({filteredFaqs.length})
            </Text>
          </View>

          {filteredFaqs.length > 0 ? (
            filteredFaqs.map((faq) => (
              <SupportFaqAccordion key={faq.id} item={faq} />
            ))
          ) : (
            <View style={styles.noResultsBox}>
              <AlertCircle size={28} color="#94a3b8" style={{ marginBottom: 8 }} />
              <Text style={styles.noResultsTitle} allowFontScaling={false}>
                No matching answers found
              </Text>
              <Text style={styles.noResultsSubtitle} allowFontScaling={false}>
                Try adjusting your search query or submit a support ticket.
              </Text>
            </View>
          )}

          {/* Still Need Help Banner */}
          <View style={styles.raiseBanner}>
            <View style={styles.raiseBannerIconBg}>
              <ShieldCheck size={22} color="#4f46e5" />
            </View>
            <View style={styles.raiseBannerTextCol}>
              <Text style={styles.raiseBannerTitle} allowFontScaling={false}>
                Didn't find what you need?
              </Text>
              <Text style={styles.raiseBannerSubtitle} allowFontScaling={false}>
                Open a support ticket and our team will get back to you promptly.
              </Text>
            </View>
            <TouchableOpacity
              style={styles.raiseBannerBtn}
              onPress={handleRaiseTicketPress}
              activeOpacity={0.8}
            >
              <Text style={styles.raiseBannerBtnText} allowFontScaling={false}>
                Open Ticket
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        /* My Tickets Tab */
        <View style={styles.ticketsContainer}>
          {!isAuthenticated ? (
            <View style={styles.authGateBox}>
              <View style={styles.authGateIconBg}>
                <LogIn size={32} color="#4f46e5" />
              </View>
              <Text style={styles.authGateTitle} allowFontScaling={false}>
                Login to View Support Tickets
              </Text>
              <Text style={styles.authGateSubtitle} allowFontScaling={false}>
                Sign in to your account to view past tickets and conversation replies.
              </Text>
              <TouchableOpacity
                style={styles.authGateBtn}
                onPress={() => router.push('/(auth)/login' as any)}
                activeOpacity={0.8}
              >
                <Text style={styles.authGateBtnText} allowFontScaling={false}>
                  Log In Now
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {/* Ticket Status Filter Chips */}
              <View style={styles.ticketFilterRow}>
                <TouchableOpacity
                  style={[styles.filterChip, ticketFilter === 'ALL' && styles.filterChipActive]}
                  onPress={() => setTicketFilter('ALL')}
                >
                  <Text
                    style={[styles.filterChipText, ticketFilter === 'ALL' && styles.filterChipTextActive]}
                    allowFontScaling={false}
                  >
                    All ({tickets.length})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, ticketFilter === 'ACTIVE' && styles.filterChipActive]}
                  onPress={() => setTicketFilter('ACTIVE')}
                >
                  <Text
                    style={[styles.filterChipText, ticketFilter === 'ACTIVE' && styles.filterChipTextActive]}
                    allowFontScaling={false}
                  >
                    Active ({openTicketsCount})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterChip, ticketFilter === 'RESOLVED' && styles.filterChipActive]}
                  onPress={() => setTicketFilter('RESOLVED')}
                >
                  <Text
                    style={[styles.filterChipText, ticketFilter === 'RESOLVED' && styles.filterChipTextActive]}
                    allowFontScaling={false}
                  >
                    Resolved ({tickets.length - openTicketsCount})
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.contentScroll}
                contentContainerStyle={styles.scrollContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                  <RefreshControl
                    refreshing={isTicketsRefetching}
                    onRefresh={refetchTickets}
                    colors={['#4f46e5']}
                    tintColor="#4f46e5"
                  />
                }
              >
                {isTicketsLoading ? (
                  <View style={styles.loadingBox}>
                    <ActivityIndicator size="large" color="#4f46e5" />
                    <Text style={styles.loadingText} allowFontScaling={false}>
                      Loading your tickets...
                    </Text>
                  </View>
                ) : filteredTickets.length > 0 ? (
                  filteredTickets.map((ticket) => (
                    <SupportTicketCard
                      key={ticket._id}
                      ticket={ticket}
                      onPress={() =>
                        router.push({
                          pathname: '/support/[id]',
                          params: { id: ticket._id },
                        } as any)
                      }
                    />
                  ))
                ) : (
                  <View style={styles.emptyTicketsBox}>
                    <View style={styles.emptyIconBg}>
                      <MessageSquare size={32} color="#94a3b8" />
                    </View>
                    <Text style={styles.emptyTitle} allowFontScaling={false}>
                      {ticketFilter === 'ALL'
                        ? 'No support tickets yet'
                        : ticketFilter === 'ACTIVE'
                        ? 'No active tickets'
                        : 'No resolved tickets'}
                    </Text>
                    <Text style={styles.emptySubtitle} allowFontScaling={false}>
                      {ticketFilter === 'ALL'
                        ? 'Have an issue with an order or account? Open a ticket to receive personalized assistance.'
                        : 'All inquiries in this category have been attended to.'}
                    </Text>
                    {ticketFilter === 'ALL' && (
                      <TouchableOpacity
                        style={styles.emptyActionBtn}
                        onPress={handleRaiseTicketPress}
                        activeOpacity={0.8}
                      >
                        <Plus size={16} color="#ffffff" style={{ marginRight: 6 }} />
                        <Text style={styles.emptyActionBtnText} allowFontScaling={false}>
                          Create a Ticket
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </ScrollView>
            </>
          )}
        </View>
      )}
    </SafeAreaScreen>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0f172a',
  },
  newTicketBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 9999,
  },
  newTicketBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingHorizontal: 16,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: '#4f46e5',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
  },
  tabLabelActive: {
    color: '#4f46e5',
    fontWeight: '800',
  },
  badge: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 9999,
    marginLeft: 6,
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '800',
  },
  contentScroll: {
    flex: 1,
  },
  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0f172a',
    paddingVertical: 8,
  },
  clearBtn: {
    padding: 4,
  },
  chipsScroll: {
    marginBottom: 16,
  },
  chipsContent: {
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9999,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  chipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  chipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  faqSectionHeader: {
    marginBottom: 12,
  },
  faqSectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#334155',
  },
  noResultsBox: {
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 16,
  },
  noResultsTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 4,
  },
  noResultsSubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  raiseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eef2ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#c7d2fe',
    padding: 16,
    marginTop: 10,
  },
  raiseBannerIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  raiseBannerTextCol: {
    flex: 1,
    marginRight: 10,
  },
  raiseBannerTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1e1b4b',
    marginBottom: 2,
  },
  raiseBannerSubtitle: {
    fontSize: 11,
    color: '#4338ca',
    lineHeight: 15,
  },
  raiseBannerBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  raiseBannerBtnText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  ticketsContainer: {
    flex: 1,
  },
  ticketFilterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 9999,
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  filterChipActive: {
    backgroundColor: '#4f46e5',
    borderColor: '#4f46e5',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b',
  },
  filterChipTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 12,
  },
  emptyTicketsBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginTop: 12,
  },
  emptyIconBg: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
    maxWidth: 280,
  },
  emptyActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4f46e5',
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 12,
  },
  emptyActionBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  authGateBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  authGateIconBg: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#eef2ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  authGateTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
    marginBottom: 6,
  },
  authGateSubtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 300,
  },
  authGateBtn: {
    backgroundColor: '#4f46e5',
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius: 14,
  },
  authGateBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
});
