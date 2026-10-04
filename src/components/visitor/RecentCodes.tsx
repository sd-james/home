import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import type { VisitorCode } from '@/lib/types';
import { describeExpiry, formatDateTime, isExpired } from '@/lib/visitorCode';

import { colors, radius, spacing } from '../theme';
import { Card, Label, Muted } from '../ui';

type Props = {
  codes: VisitorCode[];
  selectedId: string | null;
  onSelect: (code: VisitorCode) => void;
  onRemove: (code: VisitorCode) => void;
};

export function RecentCodes({ codes, selectedId, onSelect, onRemove }: Props) {
  if (codes.length === 0) return null;
  return (
    <Card>
      <Label>Recent codes</Label>
      <Muted>Tap one to share it again. Long-press to remove it.</Muted>
      {codes.map((code) => {
        const old = isExpired(code);
        return (
          <Pressable
            key={code.id}
            onPress={() => onSelect(code)}
            onLongPress={() =>
              Alert.alert(`Remove code ${code.code}?`, undefined, [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Remove', style: 'destructive', onPress: () => onRemove(code) },
              ])
            }
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.row,
              code.id === selectedId && styles.selected,
              old && { opacity: 0.45 },
              pressed && { opacity: 0.6 },
            ]}>
            <Text style={styles.code}>{code.code}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.meta}>
                {code.uses === null ? '?' : code.uses} {code.uses === 1 ? 'use' : 'uses'} ·{' '}
                {old ? 'expired' : `until ${describeExpiry(code)}`}
              </Text>
              <Text style={styles.date}>Requested {formatDateTime(code.requestedAt)}</Text>
            </View>
          </Pressable>
        );
      })}
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  selected: { borderWidth: 2, borderColor: colors.primary },
  code: { fontSize: 22, fontWeight: '800', color: colors.text, minWidth: 90, fontVariant: ['tabular-nums'] },
  meta: { fontSize: 15, color: colors.text },
  date: { fontSize: 13, color: colors.muted },
});
