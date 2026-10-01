import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { Brand } from '../components/Brand';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { Banner } from '../components/Feedback';
import { ScreenProps } from '../navigation/types';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useForm } from '../utils/useForm';
import { validateConfirmPassword, validateEmail, validatePassword } from '../utils/validators';
import { colors, font } from '../theme';

export default function RegisterScreen({ navigation }: ScreenProps<'Register'>) {
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm(
    { email: '', password: '', confirm: '' },
    { email: validateEmail, password: validatePassword, confirm: (v, all) => validateConfirmPassword(all.password, v) }
  );

  const submit = async () => {
    setFormError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      const email = form.values.email.trim().toLowerCase();
      const res = await api.register(email, form.values.password);
      navigation.navigate('VerifyEmail', { email, resendAfterSeconds: res.resendAfterSeconds });
    } catch (e) {
      if (e instanceof ApiError) {
        if (!form.applyServerFields(e.fields)) setFormError(e.message);
      } else {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Brand tagline={false} />
      <Text style={styles.title}>Create your account</Text>
      <Text style={styles.sub}>We'll email you a code to verify your address.</Text>

      {formError ? <Banner kind="error" message={formError} /> : null}

      <TextField label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" {...form.field('email')} />
      <TextField label="Password" placeholder="At least 8 characters" hint="Use 8+ characters with a letter and a number." secure autoCapitalize="none" textContentType="newPassword" returnKeyType="next" {...form.field('password')} />
      <TextField label="Confirm password" placeholder="Re-enter your password" secure autoCapitalize="none" textContentType="newPassword" returnKeyType="done" onSubmitEditing={submit} {...form.field('confirm')} />

      <Button title="Create account" onPress={submit} loading={loading} style={{ marginTop: 4 }} />

      <View style={styles.footer}>
        <Text style={styles.muted}>Already have an account? </Text>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Text style={styles.link}>Log in</Text>
        </Pressable>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 24 },
  muted: { color: colors.textMuted, fontSize: font.body },
  link: { color: colors.primary, fontWeight: '700', fontSize: font.body },
});
