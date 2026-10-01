import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, font, TAGLINE } from '../theme';

/** Logo mark + wordmark + tagline, used at the top of the auth screens. */
export function Brand({ tagline = true }: { tagline?: boolean }) {
  return (
    <View style={styles.wrap}>
      <View style={styles.mark}>
        <Text style={styles.markText}>P</Text>
      </View>
      <Text style={styles.word}>
        Padosi<Text style={{ color: colors.text }}>Pro</Text>
      </Text>
      {tagline ? <Text style={styles.tag}>{TAGLINE}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', marginTop: 12, marginBottom: 28 },
  mark: { width: 64, height: 64, borderRadius: 20, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  markText: { color: '#fff', fontSize: 34, fontWeight: '800' },
  word: { fontSize: 28, fontWeight: '800', color: colors.primary, letterSpacing: 0.3 },
  tag: { fontSize: font.body, color: colors.textMuted, marginTop: 6, textAlign: 'center' },
});
