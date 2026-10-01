import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors, radius } from '../theme';

const LENGTH = 6;

/** Six boxes drawn on top of one invisible numeric input (so paste, SMS autofill and backspace all just work). */
export function OtpInput({ value, onChange, hasError, editable = true }: { value: string; onChange: (v: string) => void; hasError?: boolean; editable?: boolean }) {
  const ref = useRef<TextInput>(null);
  const [focused, setFocused] = useState(false);

  return (
    <Pressable onPress={() => ref.current?.focus()} accessibilityLabel="Verification code input">
      <View style={styles.row}>
        {Array.from({ length: LENGTH }).map((_, i) => {
          const active = focused && i === Math.min(value.length, LENGTH - 1);
          return (
            <View key={i} style={[styles.box, active && styles.boxActive, hasError && styles.boxError]}>
              <Text style={styles.digit}>{value[i] ?? ''}</Text>
            </View>
          );
        })}
      </View>
      <TextInput
        ref={ref}
        value={value}
        onChangeText={(t) => onChange(t.replace(/\D/g, '').slice(0, LENGTH))}
        maxLength={LENGTH}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus
        editable={editable}
        caretHidden
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={styles.hidden}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  box: { flex: 1, height: 58, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  boxActive: { borderColor: colors.primary },
  boxError: { borderColor: colors.error, backgroundColor: colors.errorTint },
  digit: { fontSize: 24, fontWeight: '700', color: colors.text },
  hidden: { position: 'absolute', width: '100%', height: '100%', opacity: 0 },
});
