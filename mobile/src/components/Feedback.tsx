import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { colors, font, radius } from '../theme';
import { Button } from './Button';

/** Full-area loading state. */
export function LoadingView({ message = 'Loading…' }: { message?: string }) {
  return (
    <View style={styles.center} accessibilityLiveRegion="polite">
      <ActivityIndicator size="large" color={colors.primary} />
      <Text style={styles.muted}>{message}</Text>
    </View>
  );
}

/** Full-area error state with a retry button (and optional secondary action) so there is never a dead end. */
export function ErrorView({ message, onRetry, secondaryLabel, onSecondary }: { message: string; onRetry: () => void; secondaryLabel?: string; onSecondary?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>⚠️</Text>
      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.muted}>{message}</Text>
      <Button title="Try again" onPress={onRetry} style={{ alignSelf: 'stretch', marginTop: 20 }} />
      {secondaryLabel && onSecondary ? <Button title={secondaryLabel} onPress={onSecondary} variant="ghost" style={{ alignSelf: 'stretch', marginTop: 4 }} /> : null}
    </View>
  );
}

export function EmptyView({ emoji = '🗒️', title, message, actionLabel, onAction }: { emoji?: string; title: string; message?: string; actionLabel?: string; onAction?: () => void }) {
  return (
    <View style={styles.center}>
      <Text style={styles.emoji}>{emoji}</Text>
      <Text style={styles.title}>{title}</Text>
      {message ? <Text style={styles.muted}>{message}</Text> : null}
      {actionLabel && onAction ? <Button title={actionLabel} onPress={onAction} variant="secondary" style={{ marginTop: 16 }} /> : null}
    </View>
  );
}

/** Inline message banner for form-level errors / success notices. */
export function Banner({ kind, message }: { kind: 'error' | 'success' | 'info'; message: string }) {
  const bg = kind === 'error' ? colors.errorTint : kind === 'success' ? colors.successTint : colors.primaryTint;
  const fg = kind === 'error' ? colors.error : kind === 'success' ? colors.success : colors.primary;
  return (
    <View style={[styles.banner, { backgroundColor: bg }]} accessibilityLiveRegion="polite">
      <Text style={{ color: fg, fontSize: font.small, fontWeight: '600', lineHeight: 19 }}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 28 },
  emoji: { fontSize: 40, marginBottom: 10 },
  title: { fontSize: font.h2, fontWeight: '700', color: colors.text, marginBottom: 6, textAlign: 'center' },
  muted: { fontSize: font.body, color: colors.textMuted, textAlign: 'center', marginTop: 8, lineHeight: 22 },
  banner: { borderRadius: radius.sm, paddingVertical: 10, paddingHorizontal: 12, marginBottom: 16 },
});
