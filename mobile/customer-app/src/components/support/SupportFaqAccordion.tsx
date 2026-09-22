import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, LayoutAnimation, Platform, UIManager } from 'react-native';
import { ChevronDown, HelpCircle } from 'lucide-react-native';
import { FAQItem } from '../../types/support';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

interface SupportFaqAccordionProps {
  item: FAQItem;
  defaultExpanded?: boolean;
}

export const SupportFaqAccordion: React.FC<SupportFaqAccordionProps> = ({
  item,
  defaultExpanded = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setIsExpanded((prev) => !prev);
  };

  return (
    <View style={[styles.container, isExpanded && styles.containerExpanded]}>
      <TouchableOpacity
        onPress={toggleExpand}
        activeOpacity={0.7}
        style={styles.header}
      >
        <View style={styles.questionRow}>
          <HelpCircle size={16} color="#6366f1" style={{ marginRight: 8, marginTop: 1 }} />
          <Text style={styles.questionText} allowFontScaling={false}>
            {item.question}
          </Text>
        </View>
        <View style={[styles.arrowBg, isExpanded && styles.arrowBgExpanded]}>
          <ChevronDown
            size={16}
            color={isExpanded ? '#4f46e5' : '#94a3b8'}
            style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.body}>
          <View style={styles.bodyDivider} />
          <Text style={styles.answerText} allowFontScaling={false}>
            {item.answer}
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#f1f5f9',
    marginBottom: 10,
    overflow: 'hidden',
  },
  containerExpanded: {
    borderColor: '#e0e7ff',
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  questionRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 12,
  },
  questionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
    lineHeight: 20,
  },
  arrowBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowBgExpanded: {
    backgroundColor: '#eef2ff',
  },
  body: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  bodyDivider: {
    height: 1,
    backgroundColor: '#f1f5f9',
    marginBottom: 12,
  },
  answerText: {
    fontSize: 13,
    color: '#475569',
    lineHeight: 20,
    fontWeight: '400',
  },
});
