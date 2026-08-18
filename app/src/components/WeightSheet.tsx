// Setting what one item weighs.
//
// It used to live inside the "Move to" menu — a list of style tags — behind a
// row called "Set weight (g)", which is two unrelated jobs in one sheet: "what
// kind of thing is this" and "how heavy is it". Worse, it was wrapped in
// Platform.OS === 'ios' because it used Alert.prompt, so on Android the row
// appeared and did nothing.
//
// A real input also lets the field say "grams" itself, which Alert.prompt
// cannot: that API takes a title, a message and a default value, and has no
// placeholder. The unit was therefore either in the title ("Weight in grams",
// which reads like a question) or nowhere.
//
// WHY IT ACCEPTS ONLY DIGITS
//
// Weight feeds the bag-limit total, so a value that silently fails to parse
// shows up later as a wrong total rather than as an error here. The keypad is
// numeric, non-digits are stripped as you type, and the range is stated rather
// than enforced silently — the old code just dropped anything outside 1–50000
// with no message at all.
import React, { useState } from 'react';
import { Modal, Pressable, ScrollView, Text, TextInput, View } from 'react-native';

import { Btn, Card } from './ui';
import { kg, kgWhole } from '../units';
import { F, P, S, T } from '../theme';

const MIN_G = 1;
const MAX_G = 50000;

export default function WeightSheet({ visible, itemName, grams, onSave, onClose }: {
  visible: boolean;
  itemName: string;
  /** Current weight, or null when unset. */
  grams: number | null;
  /** null clears the weight. */
  onSave: (grams: number | null) => void;
  onClose: () => void;
}) {
  const [text, setText] = useState(grams ? String(grams) : '');

  const digits = text.replace(/[^0-9]/g, '');
  const value = digits ? parseInt(digits, 10) : null;
  const tooBig = value !== null && value > MAX_G;
  const tooSmall = value !== null && value < MIN_G;
  const ok = value !== null && !tooBig && !tooSmall;

  // Shown live rather than on submit: a number you cannot save should say so
  // while you are still looking at the keypad.
  const hint = tooBig ? `That is over ${kgWhole(MAX_G)} — check the number.`
    : tooSmall ? 'Weight must be at least 1 gram.'
    : value !== null && value >= 1000 ? kg(value)
    : null;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,24,42,0.35)' }}>
        <ScrollView
          style={{ maxHeight: '70%', backgroundColor: P.pageBg,
                   borderTopLeftRadius: 22, borderTopRightRadius: 22 }}
          contentContainerStyle={{ padding: S[5], paddingBottom: S[8] }}
          keyboardShouldPersistTaps="handled">
          <Text style={{ ...T.h2, color: P.textPri }}>Weight</Text>
          <Text style={{ ...T.body, color: P.textSec, marginTop: 2, marginBottom: S[4] }}>
            {itemName}
          </Text>

          <Card>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TextInput
                value={digits}
                onChangeText={t => setText(t.replace(/[^0-9]/g, ''))}
                keyboardType="number-pad"
                inputMode="numeric"
                placeholder="grams"
                placeholderTextColor={P.textMuted}
                maxLength={5}
                autoFocus
                style={{ ...T.h1, color: P.textPri, flex: 1, paddingVertical: S[2] }}
              />
              <Text style={{ ...T.title, color: P.textMuted }}>g</Text>
            </View>
            {!!hint && (
              <Text style={{ ...T.caption, marginTop: S[2],
                             color: tooBig || tooSmall ? P.danger : P.textMuted }}>
                {hint}
              </Text>
            )}
          </Card>

          <Btn label="Save weight" disabled={!ok} onPress={() => { onSave(value); onClose(); }} />

          {grams != null && (
            // Clearing has to be possible: a wrong weight silently skews the
            // bag total, and before this there was no way to unset one.
            <Pressable onPress={() => { onSave(null); onClose(); }}
              style={{ alignItems: 'center', paddingVertical: S[4] }}>
              <Text style={{ ...T.body, color: P.danger }}>Remove weight</Text>
            </Pressable>
          )}

          <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: S[3] }}>
            <Text style={{ ...T.body, color: P.brand }}>Cancel</Text>
          </Pressable>
        </ScrollView>
      </View>
    </Modal>
  );
}
