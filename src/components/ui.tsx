import type { ReactNode, Ref } from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type LayoutChangeEvent,
  type ScrollViewInstance,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from 'react-native';

import { useAppInsets } from './insets';
import { colors, radius, spacing, TOUCH } from './theme';

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  big,
  style,
}: {
  title: string;
  onPress: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  big?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        big && styles.buttonBig,
        buttonColors[variant].container,
        (pressed || disabled) && { opacity: disabled ? 0.4 : 0.75 },
        style,
      ]}>
      <Text style={[styles.buttonText, big && styles.buttonTextBig, buttonColors[variant].text]}>
        {title}
      </Text>
    </Pressable>
  );
}

const buttonColors: Record<ButtonVariant, { container: ViewStyle; text: { color: string } }> = {
  primary: { container: { backgroundColor: colors.primary }, text: { color: colors.primaryText } },
  secondary: {
    container: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.primary },
  },
  danger: { container: { backgroundColor: colors.dangerSoft }, text: { color: colors.danger } },
  ghost: { container: { backgroundColor: 'transparent' }, text: { color: colors.primary } },
};

export function Chip({
  label,
  selected,
  onPress,
  style,
}: {
  label: string;
  selected?: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed && { opacity: 0.7 },
        style,
      ]}>
      <Text style={[styles.chipText, selected && styles.chipTextSelected]}>{label}</Text>
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onLayout,
}: {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  onLayout?: (event: LayoutChangeEvent) => void;
}) {
  return (
    <View style={[styles.card, style]} onLayout={onLayout}>
      {children}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return <Text style={styles.label}>{children}</Text>;
}

export function Muted({ children }: { children: ReactNode }) {
  return <Text style={styles.muted}>{children}</Text>;
}

export function Field({ label, hint, ...input }: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Label>{label}</Label>
      <TextInput
        placeholderTextColor={colors.muted}
        {...input}
        style={[styles.input, input.multiline && styles.inputMultiline, input.style]}
      />
      {hint ? <Muted>{hint}</Muted> : null}
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export function Screen({ children, ref }: { children: ReactNode; ref?: Ref<ScrollViewInstance> }) {
  // In landscape the navigation buttons sit at the side; keep content clear of them.
  const insets = useAppInsets();
  return (
    <ScrollView
      ref={ref}
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={[
        styles.screen,
        { paddingLeft: spacing.lg + insets.left, paddingRight: spacing.lg + insets.right },
      ]}
      keyboardShouldPersistTaps="handled">
      {children}
    </ScrollView>
  );
}

/** A bottom sheet: easy to reach with a thumb, scrolls when tall. */
export function Sheet({
  visible,
  title,
  onClose,
  children,
  footer,
}: {
  visible: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const insets = useAppInsets();
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.sheetBackdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Close" />
        <View
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + spacing.lg,
              paddingLeft: spacing.lg + insets.left,
              paddingRight: spacing.lg + insets.right,
            },
          ]}>
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>{title}</Text>
            <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button">
              <Text style={styles.sheetClose}>Close</Text>
            </Pressable>
          </View>
          <ScrollView
            contentContainerStyle={{ gap: spacing.lg, paddingBottom: spacing.sm }}
            keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
          {footer ? <View style={{ gap: spacing.sm, paddingTop: spacing.sm }}>{footer}</View> : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: TOUCH,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonBig: { minHeight: 64 },
  buttonText: { fontSize: 17, fontWeight: '600' },
  buttonTextBig: { fontSize: 20 },
  chip: {
    minHeight: 44,
    minWidth: 44,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 16, fontWeight: '600', color: colors.text },
  chipTextSelected: { color: colors.primaryText },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.md,
  },
  label: { fontSize: 15, fontWeight: '600', color: colors.text },
  muted: { fontSize: 14, color: colors.muted },
  input: {
    minHeight: TOUCH,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    fontSize: 17,
    color: colors.text,
    backgroundColor: colors.card,
  },
  inputMultiline: { minHeight: 110, paddingTop: spacing.md, textAlignVertical: 'top' },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, alignItems: 'center' },
  screen: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl * 2 },
  sheetBackdrop: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    maxHeight: '92%',
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: colors.text, flexShrink: 1 },
  sheetClose: { fontSize: 17, color: colors.primary, fontWeight: '600' },
});
