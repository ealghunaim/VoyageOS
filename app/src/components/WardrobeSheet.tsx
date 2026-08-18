// Which garment categories apply to one traveller.
//
// A WARDROBE QUESTION, NOT AN IDENTITY ONE
//
// There is no gender field here and there should never be one. What someone
// packs is answerable directly — "do you pack dresses" — and inferring it from
// anything else is both less accurate and not the app's business. The starting
// sets are named for what they contain for the same reason: "Basics + dresses
// & skirts" describes a suitcase, "womenswear" would describe a person.
//
// STARTING POINTS, NOT A QUIZ
//
// A blank grid of fourteen checkboxes is a chore nobody finishes, so a set can
// be applied in one tap and then edited. The sets are additive over the same
// Basics, so switching between them never silently drops the essentials.
//
// Empty is a real answer. Ticking nothing means "no profile" — the generator
// falls back to exactly the behaviour that existed before profiles, which is
// why the sheet says so rather than nagging.
import React, { useState } from 'react';
import {
  Modal, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';

import ModalScreen from './ModalScreen';
import { Btn, Card } from './ui';
import { F, P, S, T } from '../theme';

// The shape lives in api.ts with the rest of the wire types; re-exported
// here so callers of this sheet do not need two imports.
export type { PackingProfile } from '../api';
import type { PackingProfile } from '../api';

/** Mirrors WARDROBE in api/packing/profiles.py. Anything the server does not
 *  recognise is dropped there, so the two lists must agree. */
const CATEGORIES: { key: string; label: string }[] = [
  { key: 'tops', label: 'Tops' },
  { key: 'bottoms', label: 'Bottoms' },
  { key: 'dresses', label: 'Dresses' },
  { key: 'skirts', label: 'Skirts' },
  { key: 'suits', label: 'Suits' },
  { key: 'abaya_kaftan', label: 'Abaya / kaftan' },
  { key: 'headwear_scarves', label: 'Headwear & scarves' },
  { key: 'outerwear', label: 'Outerwear' },
  { key: 'sleepwear', label: 'Sleepwear' },
  { key: 'underwear', label: 'Underwear' },
  { key: 'activewear', label: 'Activewear' },
  { key: 'swimwear', label: 'Swimwear' },
  { key: 'footwear', label: 'Footwear' },
  { key: 'accessories', label: 'Accessories' },
];

const BASICS = ['tops', 'bottoms', 'underwear', 'sleepwear', 'outerwear', 'footwear', 'accessories'];
const STARTING_SETS: { key: string; label: string; adds: string[] }[] = [
  { key: 'basics', label: 'Basics', adds: [] },
  { key: 'basics_dresses_skirts', label: '+ dresses & skirts', adds: ['dresses', 'skirts'] },
  { key: 'basics_tailoring', label: '+ tailoring', adds: ['suits'] },
  { key: 'basics_modest', label: '+ modest wear', adds: ['abaya_kaftan', 'headwear_scarves'] },
];

export default function WardrobeSheet({ visible, who, value, onSave, onClose }: {
  visible: boolean;
  /** Whose profile this is, for the title — "You", or a companion's name. */
  who: string;
  value: PackingProfile | null;
  onSave: (p: PackingProfile | null) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(value?.wardrobe ?? []);
  const [notes, setNotes] = useState(value?.notes ?? '');

  const toggle = (k: string) =>
    setPicked(p => (p.includes(k) ? p.filter(x => x !== k) : [...p, k]));

  // Applying a set REPLACES the selection rather than merging into it, so
  // tapping two sets in a row does not accumulate everything. Individual
  // toggles afterwards are the way to fine-tune.
  const applySet = (adds: string[]) => setPicked([...BASICS, ...adds]);

  const save = () => {
    const w = CATEGORIES.map(c => c.key).filter(k => picked.includes(k));  // canonical order
    const n = notes.trim();
    onSave(w.length || n ? { wardrobe: w, notes: n || null } : null);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ModalScreen padded={false}>
      <ScrollView style={{ flex: 1 }}
        contentContainerStyle={{ padding: S[5], paddingTop: S[4] }}
        keyboardShouldPersistTaps="handled">
        <Text style={{ ...T.h1, color: P.textPri }}>Packing profile</Text>
        <Text style={{ ...T.body, color: P.textSec, marginTop: S[2], marginBottom: S[4] }}>
          {who === 'You' ? 'What you wear' : `What ${who} wears`} — so packing lists
          only suggest clothes that make sense. Everything else (toiletries,
          chargers, documents) is unaffected.
        </Text>

        <Card>
          <Text style={{ ...T.label, color: P.textMuted, marginBottom: S[2] }}>
            START FROM…
          </Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {STARTING_SETS.map(s => (
              <Pressable key={s.key} onPress={() => applySet(s.adds)}
                style={{ paddingHorizontal: S[3], paddingVertical: 8, borderRadius: 999,
                         borderWidth: 1, borderColor: P.hairline,
                         marginRight: S[2], marginBottom: S[2] }}>
                <Text style={{ ...T.caption, color: P.textPri }}>{s.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={{ ...T.caption, color: P.textMuted }}>
            Pick one to start, then adjust anything below.
          </Text>
        </Card>

        <Card>
          {CATEGORIES.map(c => {
            const on = picked.includes(c.key);
            return (
              <Pressable key={c.key} onPress={() => toggle(c.key)}
                style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 11 }}>
                <View style={{
                  width: 22, height: 22, borderRadius: 6, marginRight: S[3],
                  borderWidth: 1.5, borderColor: on ? P.brand : P.hairlineStrong,
                  backgroundColor: on ? P.brand : 'transparent',
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  {on && <Text style={{ color: P.card, fontSize: 13, fontFamily: F.bold }}>✓</Text>}
                </View>
                <Text style={{ ...T.body, color: P.textPri }}>{c.label}</Text>
              </Pressable>
            );
          })}
        </Card>

        <Card>
          <Text style={{ ...T.label, color: P.textMuted, marginBottom: S[2] }}>
            ANYTHING ELSE
          </Text>
          <TextInput
            value={notes} onChangeText={setNotes}
            placeholder="e.g. contact lenses, knee brace"
            placeholderTextColor={P.textMuted}
            maxLength={140}
            style={{ ...T.body, color: P.textPri, backgroundColor: P.sunken,
                     borderRadius: 10, padding: S[3] }}
          />
        </Card>

        <Btn label="Save profile" onPress={save} />
        <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: S[4] }}>
          <Text style={{ ...T.body, color: P.brand }}>Cancel</Text>
        </Pressable>
        <Text style={{ ...T.caption, color: P.textMuted, textAlign: 'center' }}>
          Leave everything unticked and packing works exactly as it does today.
        </Text>
      </ScrollView>
      </ModalScreen>
    </Modal>
  );
}
