import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button } from '../components/Button';
import { Banner, EmptyView, ErrorView, LoadingView } from '../components/Feedback';
import { ScreenProps } from '../navigation/types';
import { useAuth } from '../context/AuthContext';
import { api, Me, Task } from '../api/endpoints';
import { ApiError } from '../api/client';
import { categoryIcon, colors, font, radius, shadow } from '../theme';

interface Section {
  title: string;
  data: Task[];
}

export default function TaskSelectionScreen({ navigation, route }: ScreenProps<'TaskSelection'>) {
  const isEdit = route.params?.mode === 'edit';
  const { me, setMe, signOut } = useAuth();

  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<number>>(() => new Set(me?.selectedTasks.map((t) => t.id) ?? []));
  const [query, setQuery] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // First-time save must wait until the confirm sheet has closed. Publishing `me`
  // while that sheet is open removes this screen underneath it and the next
  // screen never appears until the app is reloaded.
  const pendingMe = useRef<Me | null>(null);

  const load = useCallback(async () => {
    setTasks(null);
    setLoadError(null);
    try {
      setTasks((await api.getTasks()).tasks);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : 'Could not load tasks.');
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const toggle = (id: number) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  // Search across name, description and category, then group by category.
  const sections: Section[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = (tasks ?? []).filter((t) => !q || `${t.name} ${t.description} ${t.category}`.toLowerCase().includes(q));
    const map = new Map<string, Task[]>();
    filtered.forEach((t) => map.set(t.category, [...(map.get(t.category) ?? []), t]));
    return [...map.entries()].map(([title, data]) => ({ title, data }));
  }, [tasks, query]);

  const chosen = useMemo(() => (tasks ?? []).filter((t) => selected.has(t.id)), [tasks, selected]);

  useEffect(() => {
    if (confirming || !pendingMe.current) return;
    const next = pendingMe.current;
    pendingMe.current = null;
    setMe(next);
  }, [confirming, setMe]);

  const save = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await api.saveTasks([...selected]);
      setConfirming(false);
      if (isEdit && navigation.canGoBack()) {
        setMe(res);
        navigation.goBack();
        return;
      }
      pendingMe.current = res;
    } catch (e) {
      setSaveError(e instanceof ApiError ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const confirmLogout = () =>
    Alert.alert('Log out?', 'You can log back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Log out', style: 'destructive', onPress: signOut },
    ]);

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right', 'bottom']}>
      <View style={styles.header}>
        <View style={styles.topRow}>
          {isEdit ? (
            <Pressable onPress={() => navigation.goBack()} hitSlop={10}>
              <Text style={styles.link}>‹ Back</Text>
            </Pressable>
          ) : (
            <Text style={styles.step}>STEP 2 OF 2</Text>
          )}
          {!isEdit ? (
            <Pressable onPress={confirmLogout} hitSlop={10}>
              <Text style={styles.muted}>Log out</Text>
            </Pressable>
          ) : null}
        </View>
        <Text style={styles.title}>What can we take off your plate?</Text>
        <Text style={styles.sub}>Pick everything you'd like your Lifestyle Manager to handle.</Text>
        <View style={styles.search}>
          <Text style={{ fontSize: 16 }}>🔍</Text>
          <TextInput value={query} onChangeText={setQuery} placeholder="Search tasks" placeholderTextColor={colors.textMuted} style={styles.searchInput} returnKeyType="search" autoCorrect={false} accessibilityLabel="Search tasks" />
          {query ? (
            <Pressable onPress={() => setQuery('')} hitSlop={10} accessibilityLabel="Clear search">
              <Text style={styles.clear}>✕</Text>
            </Pressable>
          ) : null}
        </View>
      </View>

      {loadError ? (
        <ErrorView message={loadError} onRetry={load} />
      ) : !tasks ? (
        <LoadingView message="Loading tasks…" />
      ) : tasks.length === 0 ? (
        <EmptyView title="No tasks available yet" message="Please check back soon." actionLabel="Refresh" onAction={load} />
      ) : sections.length === 0 ? (
        <EmptyView emoji="🔍" title="No matching tasks" message={`Nothing matches "${query.trim()}". Try a different word.`} actionLabel="Clear search" onAction={() => setQuery('')} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(t) => String(t.id)}
          stickySectionHeadersEnabled
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
          renderSectionHeader={({ section }) => {
            const count = section.data.filter((t) => selected.has(t.id)).length;
            return (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>
                  {categoryIcon(section.title)}  {section.title}
                </Text>
                {count > 0 ? <Text style={styles.sectionCount}>{count} selected</Text> : null}
              </View>
            );
          }}
          renderItem={({ item }) => {
            const on = selected.has(item.id);
            return (
              <Pressable onPress={() => toggle(item.id)} accessibilityRole="checkbox" accessibilityState={{ checked: on }} accessibilityLabel={item.name} style={[styles.card, on && styles.cardOn]}>
                <View style={[styles.check, on && styles.checkOn]}>{on ? <Text style={styles.tick}>✓</Text> : null}</View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.taskName}>{item.name}</Text>
                  <Text style={styles.taskDesc}>{item.description}</Text>
                </View>
              </Pressable>
            );
          }}
        />
      )}

      {tasks && tasks.length > 0 ? (
        <View style={styles.bar}>
          <Text style={styles.barText}>{selected.size === 0 ? 'No tasks selected' : `${selected.size} task${selected.size === 1 ? '' : 's'} selected`}</Text>
          <Button title="Review" onPress={() => { setSaveError(null); setConfirming(true); }} disabled={selected.size === 0} style={{ minWidth: 130 }} />
        </View>
      ) : null}

      {/* Mount only while open so the sheet presents on the first tap after signup. */}
      {confirming ? (
        <Modal visible transparent animationType="slide" onRequestClose={() => !saving && setConfirming(false)}>
          <View style={styles.backdrop}>
            <SafeAreaView edges={['bottom']} style={styles.sheet}>
              <Text style={styles.sheetTitle}>Confirm your tasks</Text>
              <Text style={styles.sub}>Your Lifestyle Manager will handle these {chosen.length} task{chosen.length === 1 ? '' : 's'}.</Text>
              <ScrollView style={{ maxHeight: 280, marginVertical: 12 }}>
                {chosen.map((t) => (
                  <View key={t.id} style={styles.sheetRow}>
                    <Text style={{ fontSize: 18, marginRight: 10 }}>{categoryIcon(t.category)}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.taskName}>{t.name}</Text>
                      <Text style={styles.taskDesc}>{t.category}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              {saveError ? <Banner kind="error" message={saveError} /> : null}
              <Button title="Confirm and save" onPress={save} loading={saving} />
              <Button title="Go back and edit" onPress={() => setConfirming(false)} disabled={saving} variant="ghost" style={{ marginTop: 6 }} />
            </SafeAreaView>
          </View>
        </Modal>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  step: { color: colors.primary, fontSize: font.small, fontWeight: '800', letterSpacing: 1 },
  link: { color: colors.primary, fontSize: font.body, fontWeight: '600' },
  muted: { color: colors.textMuted, fontSize: font.body, fontWeight: '600' },
  title: { fontSize: 24, fontWeight: '800', color: colors.text, marginTop: 8 },
  sub: { fontSize: font.body, color: colors.textMuted, marginTop: 4, lineHeight: 22 },
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, paddingHorizontal: 12, marginTop: 14, gap: 8 },
  searchInput: { flex: 1, fontSize: font.body, color: colors.text, paddingVertical: 12 },
  clear: { color: colors.textMuted, fontSize: 16, paddingHorizontal: 4 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: colors.background, paddingTop: 16, paddingBottom: 8 },
  sectionTitle: { fontSize: font.body, fontWeight: '800', color: colors.text },
  sectionCount: { fontSize: font.small, fontWeight: '700', color: colors.primary },
  card: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1.5, borderColor: colors.border, padding: 14, marginBottom: 10, gap: 12 },
  cardOn: { borderColor: colors.primary, backgroundColor: colors.primaryTint },
  check: { width: 26, height: 26, borderRadius: 8, borderWidth: 2, borderColor: colors.disabled, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface },
  checkOn: { backgroundColor: colors.primary, borderColor: colors.primary },
  tick: { color: '#fff', fontWeight: '800', fontSize: 15 },
  taskName: { fontSize: font.body, fontWeight: '700', color: colors.text },
  taskDesc: { fontSize: font.small, color: colors.textMuted, marginTop: 2, lineHeight: 18 },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  barText: { fontSize: font.body, fontWeight: '700', color: colors.text },
  backdrop: { flex: 1, backgroundColor: 'rgba(10,25,20,0.5)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12, ...shadow },
  sheetTitle: { fontSize: font.h2, fontWeight: '800', color: colors.text },
  sheetRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.border },
});
