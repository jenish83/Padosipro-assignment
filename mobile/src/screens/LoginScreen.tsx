import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Screen } from '../components/Screen';
import { Brand } from '../components/Brand';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { Banner } from '../components/Feedback';
import { ScreenProps } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useForm } from '../utils/useForm';
import { validateEmail } from '../utils/validators';
import { colors, font } from '../theme';

export default function LoginScreen({ navigation, route }: ScreenProps<'Login'>) {
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm(
    { email: route.params?.email ?? '', password: '' },
    { email: validateEmail, password: (v) => (v ? null : 'Password is required.') }
  );

  // Login stays mounted under Verify Email, so a previous failure would still be on screen
  // after a successful verification. Coming back with a notice means that error is stale.
  useFocusEffect(
    useCallback(() => {
      if (route.params?.notice) setFormError(null);
    }, [route.params?.notice])
  );

  const submit = async () => {
    setFormError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      const email = form.values.email.trim().toLowerCase();
      const { token } = await api.login(email, form.values.password);
      await signIn(token); // AuthContext then routes to profile / tasks / home
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_NOT_VERIFIED') {
        // Right password, but the email is not verified yet: send them to the OTP screen.
        navigation.navigate('VerifyEmail', { email: e.details?.email ?? form.values.email.trim(), resendAfterSeconds: e.details?.resendAfterSeconds });
      } else if (e instanceof ApiError && !form.applyServerFields(e.fields)) {
        setFormError(e.message);
      } else if (!(e instanceof ApiError)) {
        setFormError('Something went wrong. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <Brand />
      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.sub}>Log in to continue.</Text>

      {route.params?.notice ? <Banner kind="success" message={route.params.notice} /> : null}
      {formError ? <Banner kind="error" message={formError} /> : null}

      <TextField label="Email" placeholder="you@example.com" keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" textContentType="emailAddress" returnKeyType="next" {...form.field('email')} />
      <TextField label="Password" placeholder="Your password" secure autoCapitalize="none" autoComplete="password" textContentType="password" returnKeyType="done" onSubmitEditing={submit} {...form.field('password')} />

      <Button title="Log in" onPress={submit} loading={loading} style={{ marginTop: 4 }} />

      <View style={styles.footer}>
        <Text style={styles.muted}>New to PadosiPro? </Text>
        <Pressable onPress={() => navigation.navigate('Register')} hitSlop={8}>
          <Text style={styles.link}>Create an account</Text>
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
