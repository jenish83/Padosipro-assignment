import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text } from 'react-native';
import { Screen } from '../components/Screen';
import { TextField } from '../components/TextField';
import { Button } from '../components/Button';
import { Banner } from '../components/Feedback';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/endpoints';
import { ApiError } from '../api/client';
import { useForm } from '../utils/useForm';
import { validateAddress, validateBusinessName, validateMobile, validateName } from '../utils/validators';
import { colors, font } from '../theme';

/** Shown once, right after the first login, until the profile has been saved. */
export default function ProfileScreen() {
  const { me, setMe, signOut } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm(
    {
      name: me?.profile?.name ?? '',
      mobile: me?.profile?.mobile ?? '',
      address: me?.profile?.address ?? '',
      businessName: me?.profile?.businessName ?? '',
    },
    { name: validateName, mobile: validateMobile, address: validateAddress, businessName: validateBusinessName }
  );

  const submit = async () => {
    setFormError(null);
    if (!form.validateAll()) return;
    setLoading(true);
    try {
      const v = form.values;
      const res = await api.saveProfile({ name: v.name.trim(), mobile: v.mobile.replace(/[\s-]/g, ''), address: v.address.trim(), businessName: v.businessName.trim() });
      setMe(res); // status becomes "needsTasks" and the navigator swaps to Task Selection
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

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can log back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <Screen>
      <Text style={styles.step}>STEP 1 OF 2</Text>
      <Text style={styles.title}>Tell us about you</Text>
      <Text style={styles.sub}>A few details so your Lifestyle Manager can get started.</Text>

      {formError ? <Banner kind="error" message={formError} /> : null}

      <TextField label="Name" placeholder="Your full name" autoCapitalize="words" autoComplete="name" textContentType="name" returnKeyType="next" {...form.field('name')} />
      <TextField
        label="Mobile number"
        placeholder="98765 43210"
        prefix="+91"
        keyboardType="number-pad"
        maxLength={10}
        autoComplete="tel"
        textContentType="telephoneNumber"
        {...form.field('mobile')}
        onChangeText={(v) => form.setValue('mobile', v.replace(/\D/g, ''))}
      />
      <TextField label="Address" placeholder="House / flat no., street, area, city" multiline autoCapitalize="sentences" textContentType="fullStreetAddress" {...form.field('address')} />
      <TextField label="Business name (optional)" placeholder="Only if you run a business" hint="Leave blank if this is for your home." autoCapitalize="words" returnKeyType="done" onSubmitEditing={submit} {...form.field('businessName')} />

      <Button title="Save and continue" onPress={submit} loading={loading} style={{ marginTop: 4 }} />
      <Pressable onPress={confirmLogout} hitSlop={10} style={{ alignSelf: 'center', marginTop: 20 }}>
        <Text style={styles.logout}>Log out</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  step: { color: colors.primary, fontSize: font.small, fontWeight: '800', letterSpacing: 1, marginTop: 8 },
  title: { fontSize: font.h1, fontWeight: '800', color: colors.text, marginTop: 6 },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 4, marginBottom: 20 },
  logout: { color: colors.textMuted, fontWeight: '600', fontSize: font.body },
});
