import React, { useCallback, useMemo, useState } from 'react';
import { Alert, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Banner, EmptyView } from '../components/Feedback';
import { ScreenProps } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/endpoints';
import { categoryIcon, colors, font, radius, shadow } from '../theme';

export default function HomeScreen({ navigation }: ScreenProps<'Home'>) {
  const { me, setMe, signOut } = useAuth();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pull-to-refresh fetches fresh data without blanking the screen.
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setError(null);
    try {
      setMe(await api.getMe());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not refresh.');
    } finally {
      setRefreshing(false);
    }
  }, [setMe]);

  const grouped = useMemo(() => {
    const map = new Map<string, string[]>();
    me?.selectedTasks.forEach((t) => map.set(t.category, [...(map.get(t.category) ?? []), t.name]));
    return [...map.entries()];
  }, [me]);

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can log back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  const firstName = me?.profile?.name.trim().split(/\s+/)[0] ?? 'there';
  const count = me?.selectedTasks.length ?? 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <ScrollView contentContainerStyle={styles.content} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} colors={[colors.primary]} />}>
        <View style={styles.hero}>
          <Text style={styles.heroHi}>Hi, {firstName} 👋</Text>
          <Text style={styles.heroSub}>Your Lifestyle Manager is on it. You don't manage tasks — we do.</Text>
        </View>

        {error ? <Banner kind="error" message={`${error} Pull down to try again.`} /> : null}

        <View style={styles.rowBetween}>
          <Text style={styles.h2}>Your tasks ({count})</Text>
          <Button title="Edit" variant="secondary" onPress={() => navigation.navigate('TaskSelection', { mode: 'edit' })} style={{ minHeight: 38, paddingHorizontal: 16 }} />
        </View>

        {count === 0 ? (
          <View style={{ height: 240 }}>
            <EmptyView title="No tasks yet" message="Choose the tasks you'd like us to handle." actionLabel="Choose tasks" onAction={() => navigation.navigate('TaskSelection', { mode: 'edit' })} />
          </View>
        ) : (
          grouped.map(([category, names]) => (
            <View key={category} style={styles.card}>
              <Text style={styles.cardTitle}>
                {categoryIcon(category)}  {category}
              </Text>
              {names.map((n) => (
                <View key={n} style={styles.taskRow}>
                  <View style={styles.dot} />
                  <Text style={styles.taskText}>{n}</Text>
                </View>
              ))}
            </View>
          ))
        )}

        <Text style={[styles.h2, { marginTop: 8 }]}>Your details</Text>
        <View style={styles.card}>
          <Detail label="Email" value={me?.user.email} />
          <Detail label="Mobile" value={me?.profile ? `+91 ${me.profile.mobile}` : undefined} />
          <Detail label="Address" value={me?.profile?.address} />
          {me?.profile?.businessName ? <Detail label="Business" value={me.profile.businessName} /> : null}
        </View>

        <Button title="Log out" variant="secondary" onPress={confirmLogout} style={{ marginTop: 8 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Detail({ label, value }: { label: string; value?: string }) {
  return (
    <View style={{ marginBottom: 10 }}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value || '—'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20, paddingBottom: 32 },
  hero: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: 20, marginBottom: 20 },
  heroHi: { color: '#fff', fontSize: 26, fontWeight: '800' },
  heroSub: { color: '#CFE5DC', fontSize: font.body, marginTop: 6, lineHeight: 22 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  h2: { fontSize: font.h2, fontWeight: '800', color: colors.text, marginBottom: 12 },
  card: { backgroundColor: colors.surface, borderRadius: radius.md, padding: 16, marginBottom: 12, ...shadow },
  cardTitle: { fontSize: font.body, fontWeight: '800', color: colors.text, marginBottom: 10 },
  taskRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginRight: 10 },
  taskText: { flex: 1, fontSize: font.body, color: colors.text },
  detailLabel: { fontSize: 12, fontWeight: '700', color: colors.textMuted, textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: font.body, color: colors.text, marginTop: 2 },
});
