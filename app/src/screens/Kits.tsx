import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { addKitItem, createKit, getKit, Kit, listKits, removeKitItem } from '../api';
import { Btn, Card } from '../components/ui';
import { C, F } from '../theme';

export default function Kits({ onBack }: { onBack: () => void }) {
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
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}>
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
                <Text style={{ color: C.sub }}>✕</Text>
              </Pressable>
            </View>
          ))}
          <TextInput style={s.input} value={newItem} onChangeText={setNewItem}
            placeholder="Add an item…" placeholderTextColor="#9aa7b8" />
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
    <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={10}><Text style={s.back}>‹ Home</Text></Pressable>
        <Text style={s.h2}>My Kits</Text>
        <View style={{ width: 48 }} />
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
          placeholder="New kit name (e.g. Fly Fishing)…" placeholderTextColor="#9aa7b8" />
        <Btn label="Create kit" disabled={!newName.trim()} onPress={async () => {
          try { await createKit(newName.trim()); setNewName(''); load(); }
          catch (e: any) { Alert.alert('Error', e.message); }
        }} />
      </Card>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: 16, paddingTop: 24 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  back: { color: C.blue, fontSize: 16, fontFamily: F.med },
  h2: { fontSize: 17, fontFamily: F.bold, color: C.text },
  name: { color: C.text, fontSize: 16, fontWeight: '600' },
  sub: { color: C.sub, marginTop: 2, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: C.border },
  input: { borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: '#fff', paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text, marginVertical: 10 },
  foot: { color: '#9aa7b8', textAlign: 'center', marginTop: 12, fontSize: 12 },
});
