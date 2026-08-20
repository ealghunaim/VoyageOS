// Which airport this stop is reached through.
//
// DEFAULT WITH A PICKER, NEVER A BLOCKING MODAL. Most trips have one sensible
// airport and asking about it would be a toll on the common case. So the
// nearest large airport is used silently, shown as a line the traveller can
// tap, and the sheet only opens if they want it. Nobody is stopped to answer a
// question they usually do not have.
//
// It matters because the Know and Go tabs answer "getting from the airport into
// town", and that is a different answer for Narita than for Haneda — 68km and
// an hour of train apart.
import React from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { NearbyAirport } from '../airports';
import { F, P, RA, S, T } from '../theme';

export default function AirportPicker({ options, chosen, place, onPick, onClose }: {
  /** Ranked by nearbyAirports: large first, then distance. options[0] is the
   *  default, and is what a stop with no stored choice behaves as. */
  options: NearbyAirport[];
  /** The stored IATA, or null for "not chosen" — which is not the same as
   *  "none", and is why the default row is marked rather than left blank. */
  chosen: string | null;
  place: string;
  onPick: (iata: string | null) => void;
  onClose: () => void;
}) {
  const defaultCode = options[0]?.iata;

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <Pressable style={s.wrap} onPress={onClose}>
        <Pressable style={s.sheet} onPress={() => {}}>
          <ScrollView contentContainerStyle={{ padding: S[5], paddingBottom: S[8] }}>
            <Text style={s.title}>Flying into {place}</Text>
            <Text style={s.sub}>
              Airport guidance — getting into town, transit, what to expect —
              is written for the airport you pick.
            </Text>

            {options.map(a => {
              const on = chosen ? a.iata === chosen : a.iata === defaultCode;
              return (
                <Pressable key={a.iata} onPress={() => { onPick(a.iata); onClose(); }}
                  style={[s.row, on && s.rowOn]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.code}>
                      {a.iata}
                      <Text style={s.name}>  {a.name}</Text>
                    </Text>
                    <Text style={s.meta}>
                      {Math.round(a.km)} km from {place}
                      {a.iata === defaultCode && !chosen ? '  ·  used by default' : ''}
                    </Text>
                  </View>
                  {on && <Text style={s.tick}>✓</Text>}
                </Pressable>
              );
            })}

            {!!chosen && (
              // Clearing is not the same as picking the default: it returns the
              // stop to "whatever is nearest", so the answer improves when the
              // airport data does rather than being frozen at today's.
              <Pressable onPress={() => { onPick(null); onClose(); }}
                style={{ alignItems: 'center', paddingVertical: S[4] }}>
                <Text style={[T.body, { color: P.textSec }]}>Use the nearest automatically</Text>
              </Pressable>
            )}

            <Pressable onPress={onClose} style={{ alignItems: 'center', paddingVertical: S[3] }}>
              <Text style={[T.body, { color: P.brand }]}>Cancel</Text>
            </Pressable>
          </ScrollView>
        </Pressable>
      </Pressable>
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
  sub: { ...T.body, color: P.textSec, marginTop: S[1], marginBottom: S[4], lineHeight: 20 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: P.card, borderRadius: RA.md,
    borderWidth: 1, borderColor: P.hairline,
    padding: S[3] + 2, marginBottom: S[2],
  },
  rowOn: { borderColor: P.brand, borderWidth: 2 },
  code: { ...T.body, fontFamily: F.bold, color: P.textPri },
  name: { ...T.caption, fontFamily: F.reg, color: P.textSec },
  meta: { ...T.caption, color: P.textMuted, marginTop: 2 },
  tick: { ...T.title, color: P.brand, marginLeft: S[2] },
});
