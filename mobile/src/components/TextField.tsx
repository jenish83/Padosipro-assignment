import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, font, radius } from '../theme';

interface Props extends TextInputProps {
  label: string;
  error?: string | null;
  hint?: string;
  prefix?: string; // e.g. "+91"
  secure?: boolean; // password field with show/hide toggle
}

export const TextField = forwardRef<TextInput, Props>(function TextField({ label, error, hint, prefix, secure, style, ...rest }, ref) {
  const [focused, setFocused] = useState(false);
  const [hidden, setHidden] = useState(true);

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, focused && styles.boxFocused, !!error && styles.boxError, rest.multiline && { alignItems: 'flex-start' }]}>
        {prefix ? <Text style={styles.prefix}>{prefix}</Text> : null}
        <TextInput
          ref={ref}
          placeholderTextColor={colors.textMuted}
          {...rest}
          secureTextEntry={secure ? hidden : rest.secureTextEntry}
          onFocus={(e) => {
            setFocused(true);
            rest.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            rest.onBlur?.(e);
          }}
          accessibilityLabel={label}
          style={[styles.input, rest.multiline && { minHeight: 84, textAlignVertical: 'top', paddingTop: 14 }, style]}
        />
        {secure ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={10} accessibilityRole="button" accessibilityLabel={hidden ? 'Show password' : 'Hide password'}>
            <Text style={styles.toggle}>{hidden ? 'Show' : 'Hide'}</Text>
          </Pressable>
        ) : null}
      </View>
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text style={styles.hint}>{hint}</Text>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: font.small, fontWeight: '600', color: colors.text, marginBottom: 6 },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 14,
  },
  boxFocused: { borderColor: colors.primary },
  boxError: { borderColor: colors.error, backgroundColor: colors.errorTint },
  prefix: { fontSize: font.body, color: colors.text, fontWeight: '600', marginRight: 8, paddingRight: 10, borderRightWidth: 1, borderRightColor: colors.border },
  input: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: 14 },
  toggle: { color: colors.primary, fontWeight: '700', fontSize: font.small, marginLeft: 8 },
  error: { color: colors.error, fontSize: font.small, marginTop: 6 },
  hint: { color: colors.textMuted, fontSize: font.small, marginTop: 6 },
});
