// What the kit did, item by item.
//
// APPLY THEN SUMMARISE. The kit is already on the list by the time this can
// open — thirty pre-flight dialogs to resolve thirty items is a toll, not a
// feature. So this is a receipt, not a permission slip, and it is reached by
// choice from one summary line rather than shown to everybody.
//
// Each row says what HAPPENED, not merely that something did. "Socks: merged
// 4+3 → 7" is checkable at a glance; "Socks: duplicate" leaves the reader to
// wonder which copy survived and at what quantity. The conflicts array from
// the server carries exactly the arithmetic needed to say it, so it is spent
// here rather than summarised away.
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { KitApplied } from '../api';
import { describe } from '../kitSummary';
import { F, P, RA, S, T } from '../theme';

export default function KitReviewSheet({ result, onClose }: {
  result: KitApplied | null;
  onClose: () => void;
}) {
  if (!result) return null;
  const { conflicts } = result;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.wrap}>
        <View style={s.sheet}>
          <ScrollView contentContainerStyle={{ padding: S[5], paddingBottom: S[8] }}>
            <Text style={s.title}>{result.kit}</Text>
            <Text style={s.sub}>
              {result.added > 0
                ? `${result.added} item${result.added === 1 ? '' : 's'} added to your list.`
                : 'Everything in this kit was already on your list.'}
            </Text>

            {conflicts.length > 0 && (
              <>
                <Text style={s.head}>ALREADY ON THE LIST</Text>
                {conflicts.map((c, i) => (
                  <View key={`${c.name}-${i}`} style={[s.row, i > 0 && s.rowTop]}>
                    <Text style={s.name} numberOfLines={1}>{c.name}</Text>
                    <Text style={[s.what, c.action === 'skipped' && s.muted]}>
                      {describe(c)}
                    </Text>
                  </View>
                ))}
              </>
            )}

            {result.capped > 0 && (
              // Named explicitly. A silently capped quantity is one the
              // traveller believes they asked for and did not get.
              <Text style={s.note}>
                Quantities are capped at 99. {result.capped === 1 ? 'One item' : `${result.capped} items`}
                {' '}reached the cap and was not increased further.
              </Text>
            )}

            <Text style={s.note}>
              Applying this kit again changes nothing — items it has already
              contributed are left alone.
            </Text>

            <Pressable onPress={onClose} style={s.done}>
              <Text style={s.doneText}>Done</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,24,42,0.35)' },
  sheet: {
    maxHeight: '80%', backgroundColor: P.pageBg,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  title: { ...T.h1, color: P.textPri },
  sub: { ...T.body, color: P.textSec, marginTop: S[1], marginBottom: S[4] },
  head: { ...T.label, color: P.textMuted, marginBottom: S[2] },
  row: { paddingVertical: S[2] + 2 },
  rowTop: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: P.hairline },
  name: { ...T.body, fontFamily: F.bold, color: P.textPri },
  what: { ...T.caption, color: P.textSec, marginTop: 1 },
  muted: { color: P.textMuted },
  note: { ...T.caption, color: P.textMuted, marginTop: S[4], lineHeight: 17 },
  done: {
    backgroundColor: P.brand, borderRadius: RA.sm,
    paddingVertical: S[3] + 2, alignItems: 'center', marginTop: S[5],
  },
  doneText: { ...T.body, fontFamily: F.bold, color: P.textOnDark },
});
