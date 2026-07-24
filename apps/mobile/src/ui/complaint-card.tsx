import type { ComplaintListItem } from '@local-wellness/types';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { getComplaintStatusGroup } from '../dashboard/complaint-summary';
import { CivicIcon } from './civic-icon';
import { useLocalization } from './localization';
import { complaintStatusMessageKeys } from './localized-mobile-copy';
import { mobileTheme } from './theme';

export const ComplaintCard = ({
  complaint,
  onPress,
}: Readonly<{ complaint: ComplaintListItem; onPress: () => void }>) => {
  const { formatDate, t } = useLocalization();
  const statusGroup = getComplaintStatusGroup(complaint.status);
  const status = t(complaintStatusMessageKeys[complaint.status]);

  return (
    <Pressable
      accessibilityHint={t('openComplaintDetailsHint')}
      accessibilityLabel={t('complaintCardLabel', {
        category: complaint.categoryName,
        number: complaint.complaintNumber,
        status,
      })}
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
            {status}
          </Text>
        </View>
      </View>
      <Text style={styles.number}>{complaint.complaintNumber}</Text>
      <View style={styles.footer}>
        <Text style={styles.date}>{t('updatedOn', { date: formatDate(complaint.updatedAt) })}</Text>
        <CivicIcon color={mobileTheme.colors.primary} name="chevron-right" />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  activePill: { backgroundColor: mobileTheme.colors.infoSoft },
  activeText: { color: mobileTheme.colors.info },
  attentionPill: { backgroundColor: mobileTheme.colors.warningSoft },
  attentionText: { color: mobileTheme.colors.warning },
  card: {
    ...mobileTheme.shadow.surface,
    backgroundColor: mobileTheme.colors.surface,
    borderColor: mobileTheme.colors.border,
    borderRadius: mobileTheme.radius.large,
    borderWidth: 1,
    gap: 8,
    padding: 17,
  },
  cardPressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
  category: { color: mobileTheme.colors.text, flex: 1, fontSize: 16, fontWeight: '800' },
  date: { color: mobileTheme.colors.muted, fontSize: 13 },
  footer: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  number: { color: mobileTheme.colors.muted, fontSize: 14, fontWeight: '700' },
  resolvedPill: { backgroundColor: mobileTheme.colors.primarySoft },
  resolvedText: { color: mobileTheme.colors.primary },
  statusPill: { borderRadius: 999, maxWidth: '48%', paddingHorizontal: 10, paddingVertical: 6 },
  statusText: { fontSize: 11, fontWeight: '800', textAlign: 'center' },
  topline: { alignItems: 'center', flexDirection: 'row', gap: 10 },
});
