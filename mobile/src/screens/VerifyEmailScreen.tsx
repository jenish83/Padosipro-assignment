import React, { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Screen } from '../components/Screen';
import { OtpInput } from '../components/OtpInput';
import { Button } from '../components/Button';
import { Banner } from '../components/Feedback';
import { ScreenProps } from '../navigation/types';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { validateOtp, formatCountdown } from '../utils/validators';
import { RESEND_COOLDOWN_SECONDS } from '../config';
import { colors, font } from '../theme';

// Errors after which the current code is useless and the user must request a new one.
const NEEDS_NEW_CODE = ['OTP_EXPIRED', 'OTP_LOCKED', 'OTP_NOT_FOUND'];

export default function VerifyEmailScreen({ navigation, route }: ScreenProps<'VerifyEmail'>) {
  const { email, resendAfterSeconds } = route.params;
  const [code, setCode] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [needsNewCode, setNeedsNewCode] = useState(false);
  const [seconds, setSeconds] = useState(resendAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
  const busy = useRef(false);

  // Resend countdown: ticks once a second until it reaches 0.
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);

  const verify = async (value: string) => {
    if (busy.current) return;
    const problem = validateOtp(value);
    if (problem) return setError(problem);
    busy.current = true;
    setVerifying(true);
    setError(null);
    try {
      await api.verifyEmail(email, value);
      // Registration flow ends here: the user logs in from the Login screen.
      navigation.popTo('Login', { email, notice: '✅ Email verified! Please log in to continue.' });
    } catch (e) {
      const err = e instanceof ApiError ? e : null;
      setError(err ? err.message : 'Something went wrong. Please try again.');
      setCode('');
      if (err && NEEDS_NEW_CODE.includes(err.code)) setNeedsNewCode(true);
    } finally {
      busy.current = false;
      setVerifying(false);
    }
  };

  const onChange = (v: string) => {
    setCode(v);
    setError(null);
    if (v.length === 6) verify(v); // auto-submit when the 6th digit is entered
  };

  const resend = async () => {
    setResending(true);
    setError(null);
    setInfo(null);
    try {
      const res = await api.resendOtp(email);
      setSeconds(res.resendAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
      setCode('');
      setNeedsNewCode(false);
      setInfo('A new code is on its way. Check your inbox.');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'OTP_COOLDOWN') setSeconds(e.details?.retryAfterSeconds ?? RESEND_COOLDOWN_SECONDS);
      setError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setResending(false);
    }
  };

  return (
    <Screen>
      <Pressable onPress={() => navigation.goBack()} hitSlop={10} style={{ alignSelf: 'flex-start', marginBottom: 12 }}>
        <Text style={styles.back}>‹ Back</Text>
      </Pressable>

      <Text style={styles.emoji}>✉️</Text>
      <Text style={styles.title}>Check your email</Text>
      <Text style={styles.sub}>
        We sent a 6-digit code to <Text style={{ fontWeight: '700', color: colors.text }}>{email}</Text>. It is valid for 10 minutes.
      </Text>

      {info ? <Banner kind="success" message={info} /> : null}
      <OtpInput value={code} onChange={onChange} hasError={!!error} editable={!verifying} />
      {error ? (
        <Text style={styles.error} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : null}

      <Button title="Verify email" onPress={() => verify(code)} loading={verifying} disabled={code.length < 6} style={{ marginTop: 24 }} />

      <View style={styles.resendRow}>
        {seconds > 0 ? (
          <Text style={styles.muted}>
            Resend code in <Text style={{ fontWeight: '700', color: colors.text }}>{formatCountdown(seconds)}</Text>
          </Text>
        ) : (
          <Button title={resending ? 'Sending…' : needsNewCode ? 'Send me a new code' : "Didn't get it? Resend code"} onPress={resend} loading={resending} variant={needsNewCode ? 'primary' : 'ghost'} />
        )}
      </View>
      {needsNewCode && seconds > 0 ? <Text style={[styles.muted, { textAlign: 'center', marginTop: 8 }]}>You'll be able to request a new code shortly.</Text> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  back: { color: colors.primary, fontSize: font.body, fontWeight: '600' },
  emoji: { fontSize: 44, marginTop: 8, marginBottom: 8 },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 6, marginBottom: 24, lineHeight: 22 },
  error: { color: colors.error, fontSize: font.small, marginTop: 10, fontWeight: '600' },
  resendRow: { alignItems: 'center', marginTop: 20 },
  muted: { color: colors.textMuted, fontSize: font.body },
});
