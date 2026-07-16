import type { ComplaintListItem } from '@local-wellness/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { formatComplaintStatus, getComplaintStatusGroup } from '../dashboard/complaint-summary';

export const ComplaintCard = ({
  complaint,
  onPress,
}: Readonly<{ complaint: ComplaintListItem; onPress: () => void }>) => {
  const statusGroup = getComplaintStatusGroup(complaint.status);

  return (
    <Pressable
      accessibilityHint="Opens the complaint details and timeline"
      accessibilityLabel={`${complaint.categoryName}, complaint ${complaint.complaintNumber}, ${formatComplaintStatus(complaint.status)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      <View style={styles.topline}>
        <Text numberOfLines={1} style={styles.category}>
          {complaint.categoryName}
        </Text>
        <View
          style={[
            styles.statusPill,
            statusGroup === 'resolved'
              ? styles.resolvedPill
              : statusGroup === 'attention'
                ? styles.attentionPill
                : styles.activePill,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              statusGroup === 'resolved'
                ? styles.resolvedText
                : statusGroup === 'attention'
                  ? styles.attentionText
                  : styles.activeText,
            ]}
          >
            {formatComplaintStatus(complaint.status)}
          </Text>
        </View>
      </View>
      <Text style={styles.number}>{complaint.complaintNumber}</Text>
      <View style={styles.footer}>
        <Text style={styles.date}>
          Updated {new Date(complaint.updatedAt).toLocaleDateString()}
        </Text>
        <Text
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={styles.chevron}
        >
          ›
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  activePill: { backgroundColor: '#e8f0ff' },
  activeText: { color: '#1d4ed8' },
  attentionPill: { backgroundColor: '#fff7e6' },
  attentionText: { color: '#9a4b0c' },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#e1e8e3',
    borderRadius: 18,
    borderWidth: 1,
    elevation: 1,
    gap: 8,
    padding: 17,
    shadowColor: '#0f2418',
    shadowOffset: { height: 2, width: 0 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  category: { color: '#183526', flex: 1, fontSize: 17, fontWeight: '800' },
  chevron: { color: '#2f6d49', fontSize: 25, lineHeight: 25 },
  date: { color: '#6a7c70', fontSize: 13 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  number: { color: '#52705d', fontSize: 14, fontWeight: '700' },
  resolvedPill: { backgroundColor: '#e9f8ee' },
  resolvedText: { color: '#1f6b3a' },
  statusPill: { borderRadius: 999, maxWidth: '48%', paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  topline: { alignItems: 'center', flexDirection: 'row', gap: 10 },
});
