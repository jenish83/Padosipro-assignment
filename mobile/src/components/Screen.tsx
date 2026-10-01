import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors } from '../theme';

/** Standard screen wrapper: safe area, keyboard avoidance, scrolling (so small phones never clip a form). */
export function Screen({ children, scroll = true, padded = true }: { children: React.ReactNode; scroll?: boolean; padded?: boolean }) {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom', 'left', 'right']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView contentContainerStyle={[styles.content, padded && styles.padded]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {children}
          </ScrollView>
        ) : (
          <View style={[{ flex: 1 }, padded && styles.padded]}>{children}</View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1 },
  padded: { paddingHorizontal: 20, paddingVertical: 16 },
});
