import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addKitItem, createKit, getKit, Kit, listKits, removeKitItem } from '../api';
import { Btn, Card } from '../components/ui';
import { P, RA, S, T } from '../theme';
import { FAB_CLEARANCE } from '../components/TopBar';

export default function Kits() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [open, setOpen] = useState<(Kit & { items: { item_id: string; name: string; qty: number }[] }) | null>(null);
  const [newName, setNewName] = useState('');
  const [newItem, setNewItem] = useState('');

  const load = useCallback(async () => {
    try { setKits(await listKits()); } catch (e: any) { Alert.alert('Error', e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openKit = async (id: string) => {
    try { setOpen(await getKit(id)); } catch (e: any) { Alert.alert('Error', e.message); }
  };

  if (open) {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={s.wrap}>
        <View style={s.header}>
          <Pressable onPress={() => { setOpen(null); load(); }} hitSlop={10}>
            <Text style={s.back}>‹ Kits</Text>
          </Pressable>
          <Text style={s.h2}>{open.name}</Text>
          <View style={{ width: 40 }} />
        </View>
        <Card>
          {open.items.length === 0 && <Text style={s.sub}>Empty kit — add the gear you always bring.</Text>}
          {open.items.map(i => (
            <View key={i.item_id} style={s.row}>
              <Text style={s.name}>{i.name}{i.qty > 1 ? `  ×${i.qty}` : ''}</Text>
              <Pressable hitSlop={10} onPress={async () => {
                await removeKitItem(open.id, i.item_id); openKit(open.id);
              }}>
                <Text style={s.x}>✕</Text>
              </Pressable>
            </View>
          ))}
          <TextInput style={s.input} value={newItem} onChangeText={setNewItem}
            placeholder="Add an item…" placeholderTextColor={P.textMuted} />
          <Btn label="Add" disabled={!newItem.trim()} onPress={async () => {
            try { await addKitItem(open.id, newItem); setNewItem(''); openKit(open.id); }
            catch (e: any) { Alert.alert('Error', e.message); }
          }} />
        </Card>
        <Text style={s.foot}>Apply kits from any trip's packing screen.</Text>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={s.wrap}>
      {/* No back link: this is a tab root, and the tab bar is the way
          between it and the others. A "‹ Home" here would point sideways. */}
      <View style={s.header}>
        <Text style={s.h2}>My Kits</Text>
      </View>
      {kits.map(k => (
        <Pressable key={k.id} onPress={() => openKit(k.id)}>
          <Card>
            <Text style={s.name}>{k.name}</Text>
            <Text style={s.sub}>{k.item_count ?? 0} items</Text>
          </Card>
        </Pressable>
      ))}
      <Card>
        <TextInput style={s.input} value={newName} onChangeText={setNewName}
          placeholder="New kit name (e.g. Fly Fishing)…" placeholderTextColor={P.textMuted} />
        <Btn label="Create kit" disabled={!newName.trim()} onPress={async () => {
          try { await createKit(newName.trim()); setNewName(''); load(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        }} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: S[4], paddingTop: S[6] , paddingBottom: FAB_CLEARANCE },
  header: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: S[3],
  },
  // Kits is reached from Home, not from inside a trip, so it wears brand blue
  // rather than a destination accent — the same position Archive and Documents
  // take. The accent belongs to a trip; this screen does not have one.
  back: { ...T.title, color: P.brand },
  h2: { ...T.h2, color: P.textPri },
  // T.title carries F.med. The previous fontWeight: '600' against a
  // single-weight Satoshi made the renderer smear the regular cut instead of
  // reaching for the real medium one.
  name: { ...T.title, color: P.textPri },
  sub: { ...T.caption, color: P.textSec, marginTop: 2, marginBottom: S[2] },
  x: { ...T.body, color: P.textSec },
  row: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: S[2] + 1, borderBottomWidth: 1, borderBottomColor: P.hairline,
  },
  // Sunken and borderless, matching Field in ui.tsx and every migrated input.
  // This one had kept a white fill inside a visible border, which read as a
  // different kind of control on a screen full of the other kind.
  input: {
    backgroundColor: P.sunken, borderRadius: RA.md, paddingHorizontal: S[4],
    paddingVertical: S[3], ...T.body, color: P.textPri, marginVertical: S[3],
  },
  foot: { ...T.caption, color: P.textMuted, textAlign: 'center', marginTop: S[3] },
});
