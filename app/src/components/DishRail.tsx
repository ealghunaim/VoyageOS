// Local dishes, as a rail you scroll sideways.
//
// This was a vertical list: one Card holding a row per dish, each a 58px
// thumbnail beside a name and a note. That was tolerable at the four to six
// dishes the guide used to return. 1c raised it to eight to ten, and ten rows
// is roughly seven hundred pixels of column that the restaurants — the part
// you act on when you are hungry — now sit below. The food guide got better
// and the screen got worse.
//
// Sideways buys the space back: ten dishes cost one screen width instead of
// ten screen-heights, and the photos that were already being fetched get to be
// the size they earn. The last card is deliberately allowed to peek past the
// edge, because a rail that ends flush with the screen looks like a list that
// happens to be short.
//
// WHY EVERY CARD IS THE SAME HEIGHT
//
// Photos arrive one at a time from dishPhoto(), and some never arrive at all.
// Sizing a card to its content would make the rail twitch and re-lay-out for
// several seconds after the guide opens, and leave a ragged bottom edge
// afterwards. The geometry is fixed and the photo slot holds a placeholder
// until — or instead of — an image.
import React, { useState } from 'react';
import {
  Image, Modal, Pressable, ScrollView, StyleSheet, Text, View,
} from 'react-native';

import { F, P, RA, S, T } from '../theme';

export type Dish = { name: string; note?: string };

const CARD_W = 156;
const PHOTO_H = 112;

export default function DishRail({ dishes, photos, accent }: {
  dishes: Dish[];
  /** Dish name → photo url, filled in as they load. Missing is normal. */
  photos: Record<string, string>;
  accent: string;
}) {
  const [open, setOpen] = useState<Dish | null>(null);
  if (!dishes.length) return null;

  return (
    <>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        // Snapping makes the rail land on whole cards rather than stopping
        // mid-photo, which is what makes a row of images read as a set of
        // things rather than as one wide picture.
        snapToInterval={CARD_W + S[2]}
        decelerationRate="fast"
        style={{ marginBottom: S[3] }}
        contentContainerStyle={{ paddingRight: S[5] }}>
        {dishes.map((d, i) => {
          const uri = photos[d.name];
          return (
            <Pressable key={`${d.name}-${i}`} onPress={() => setOpen(d)}
              accessibilityRole="button"
              accessibilityLabel={d.note ? `${d.name}. ${d.note}` : d.name}
              style={[s.card, i > 0 && { marginLeft: S[2] }]}>
              <View style={[s.photo, { backgroundColor: P.sunken }]}>
                {!!uri && <Image source={{ uri }} style={s.photoImg} />}
                {!uri && (
                  // Not a spinner: most of these resolve in under a second and
                  // the ones that never resolve would spin forever. A quiet
                  // block reads as "no photo" rather than as "still trying".
                  <Text style={[s.placeholder, { color: accent }]} numberOfLines={1}>
                    {d.name.slice(0, 1).toUpperCase()}
                  </Text>
                )}
              </View>
              <View style={s.body}>
                <Text style={s.name} numberOfLines={2}>{d.name}</Text>
                {!!d.note && <Text style={s.note} numberOfLines={3}>{d.note}</Text>}
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Truncating to three lines is what makes a uniform card possible, so
          the full note has to be reachable somewhere or the rail costs the
          reader something the vertical list gave them. */}
      <Modal visible={!!open} animationType="slide" transparent
        onRequestClose={() => setOpen(null)}>
        <Pressable style={s.sheetWrap} onPress={() => setOpen(null)}>
          <Pressable style={s.sheet} onPress={() => {}}>
            {!!open && (
              <ScrollView contentContainerStyle={{ padding: S[5], paddingBottom: S[8] }}>
                {!!photos[open.name] && (
                  <Image source={{ uri: photos[open.name] }} style={s.sheetPhoto} />
                )}
                <Text style={s.sheetName}>{open.name}</Text>
                {!!open.note && <Text style={s.sheetNote}>{open.note}</Text>}
                <Pressable onPress={() => setOpen(null)}
                  style={{ alignItems: 'center', paddingVertical: S[4] }}>
                  <Text style={[T.body, { color: accent, fontFamily: F.bold }]}>Close</Text>
                </Pressable>
              </ScrollView>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  card: {
    width: CARD_W, backgroundColor: P.card, borderRadius: RA.md,
    borderWidth: 1, borderColor: P.hairline, overflow: 'hidden',
  },
  photo: { height: PHOTO_H, alignItems: 'center', justifyContent: 'center' },
  photoImg: { width: '100%', height: '100%' },
  placeholder: { ...T.display, opacity: 0.35 },
  // A fixed body height, not minHeight: two dishes whose names wrap to
  // different line counts would otherwise sit at different heights and the
  // rail would look broken rather than varied.
  body: { height: 92, paddingHorizontal: S[3], paddingTop: S[2] },
  name: { ...T.body, fontFamily: F.bold, color: P.textPri },
  note: { ...T.caption, color: P.textSec, marginTop: 2, lineHeight: 15 },
  sheetWrap: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(13,24,42,0.35)' },
  sheet: {
    maxHeight: '80%', backgroundColor: P.pageBg,
    borderTopLeftRadius: 22, borderTopRightRadius: 22,
  },
  sheetPhoto: { width: '100%', height: 200, borderRadius: RA.md, marginBottom: S[4] },
  sheetName: { ...T.h1, color: P.textPri },
  sheetNote: { ...T.body, color: P.textSec, lineHeight: 22, marginTop: S[2] },
});
