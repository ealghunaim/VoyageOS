import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getPhrases, Phrase, Trip } from '../api';
import { CURRENCIES, currencyForCountry, getRate } from '../fx';
import { E, F, P, RA, S, T, tint } from '../theme';
import TileIcon from '../components/icons';

export default function TripExtras({ trip, accent, onSOS }: { trip: Trip; accent: string; onSOS?: () => void }) {
  const [open, setOpen] = useState<null | 'phrases' | 'money'>(null);
  const [fromCcy, setFromCcy] = useState(currencyForCountry(trip.country_code) ?? 'USD'); // where you are

  const [phrases, setPhrases] = useState<{ language: string; phrases: Phrase[] } | null>(null);
  const [pBusy, setPBusy] = useState(false);
  useEffect(() => {
    if (open !== 'phrases' || phrases) return;
    setPBusy(true);
    getPhrases(trip.id).then(setPhrases).catch(() => setPhrases({ language: '', phrases: [] })).finally(() => setPBusy(false));
  }, [open, phrases, trip.id]);

  const [toCcy, setToCcy] = useState('KWD'); // your home
  const ordered = (sel: string) => [sel, ...CURRENCIES.filter(c => c !== sel)];
  const [amount, setAmount] = useState('100');
  const [rate, setRate] = useState<number | null>(null);
  const [rBusy, setRBusy] = useState(false);
  useEffect(() => {
    if (open !== 'money') return;
    setRBusy(true); setRate(null);
    getRate(fromCcy, toCcy).then(setRate).finally(() => setRBusy(false));
  }, [open, fromCcy, toCcy]);

  const amt = parseFloat(amount) || 0;
  const converted = rate != null ? amt * rate : null;

  return (
    <View style={{ marginBottom: S[3] }}>
      <View style={{ flexDirection: 'row' }}>
        <Pressable onPress={() => setOpen(open === 'phrases' ? null : 'phrases')}
          style={[s.sq, { marginRight: S[3] }, open === 'phrases' && { borderColor: accent, backgroundColor: tint(accent, 0.06) }]}>
          <View style={s.row}>
            <TileIcon kind="phrases" accent={accent} size={24} />
            <Text numberOfLines={1} style={[s.sqLabel, { marginLeft: S[2] }]}>Phrases</Text>
          </View>
        </Pressable>
        <Pressable onPress={() => setOpen(open === 'money' ? null : 'money')}
          style={[s.sq, { marginRight: S[3] }, open === 'money' && { borderColor: accent, backgroundColor: tint(accent, 0.06) }]}>
          <View style={s.row}>
            <TileIcon kind="currency" accent={accent} size={24} />
            <Text numberOfLines={1} style={[s.sqLabel, { marginLeft: S[2] }]}>Currency</Text>
          </View>
        </Pressable>
        {/* SOS sits here rather than at the bottom of the folder stack: in an
            emergency it must be reachable without scrolling. Its icon takes
            P.danger, not the destination accent, for the same reason the call
            buttons inside SOS do. */}
        <Pressable onPress={onSOS} style={s.sq}>
          <View style={s.row}>
            <TileIcon kind="sos" accent={P.danger} size={24} />
            <Text numberOfLines={1} style={[s.sqLabel, { marginLeft: S[2] }]}>SOS</Text>
          </View>
        </Pressable>
      </View>

      {open === 'phrases' && (
        <View style={s.panel}>
          {pBusy && <ActivityIndicator color={accent} />}
          {!!phrases && phrases.phrases.length > 0 && (
            <>
              {!!phrases.language && <Text style={[s.lang, { color: accent }]}>{phrases.language}</Text>}
              {phrases.phrases.map((p, i) => (
                <View key={i} style={[{ paddingVertical: S[2] }, i > 0 && { borderTopWidth: 1, borderTopColor: P.hairline }]}>
                  <Text style={s.local}>{p.local}</Text>
                  <Text style={s.en}>{p.en}{p.pron ? `  ·  ${p.pron}` : ''}</Text>
                </View>
              ))}
              <Text style={s.note}>Pronunciation is a rough guide — locals will meet you halfway.</Text>
            </>
          )}
          {!!phrases && phrases.phrases.length === 0 && !pBusy && (
            <Text style={s.en}>Couldn't load phrases — try again shortly.</Text>
          )}
        </View>
      )}

      {open === 'money' && (
        <View style={s.panel}>
          <TextInput style={s.amt} value={amount} onChangeText={setAmount} keyboardType="numeric" />
          <Text style={s.pickLabel}>FROM</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
            {ordered(fromCcy).map(c => (
              <Pressable key={c} onPress={() => setFromCcy(c)}
                style={[s.ccyChip, c === fromCcy && { backgroundColor: accent, borderColor: accent }]}>
                <Text style={[s.ccyChipText, c === fromCcy && { color: P.textOnDark }]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.pickLabel}>TO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {ordered(toCcy).map(c => (
              <Pressable key={c} onPress={() => setToCcy(c)}
                style={[s.ccyChip, c === toCcy && { backgroundColor: accent, borderColor: accent }]}>
                <Text style={[s.ccyChipText, c === toCcy && { color: P.textOnDark }]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <View style={{ alignItems: 'center', marginVertical: 8 }}>
            {rBusy ? <ActivityIndicator color={accent} />
              : converted != null ? (
                <>
                  <Text style={[s.result, { color: accent }]}>{converted.toLocaleString(undefined, { maximumFractionDigits: 2 })} {toCcy}</Text>
                  <Text style={s.en}>{amt.toLocaleString()} {fromCcy} · rate {rate?.toFixed(4)}</Text>
                </>
              ) : <Text style={s.en}>Rate unavailable for {fromCcy} → {toCcy}.</Text>}
          </View>
          <Text style={s.note}>Indicative daily rate — banks and ATMs add a margin.</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  sq: { flex: 1, backgroundColor: P.card, borderRadius: RA.lg, borderWidth: 1,
        borderColor: P.hairline, paddingHorizontal: S[4], paddingVertical: S[3], ...E.low },
  row: { flexDirection: 'row', alignItems: 'center' },
  sqLabel: { ...T.caption, fontFamily: F.med, color: P.textPri },
  panel: { backgroundColor: P.card, borderRadius: RA.lg, borderWidth: 1,
           borderColor: P.hairline, padding: S[4], marginTop: S[3], ...E.low },
  lang: { ...T.caption, fontFamily: F.bold, marginBottom: S[1] },
  local: { ...T.title, fontFamily: F.bold, color: P.textPri },
  en: { ...T.caption, color: P.textSec, marginTop: 1 },
  note: { ...T.caption, color: P.textMuted, marginTop: S[2] },
  amt: {
    backgroundColor: P.sunken, borderRadius: RA.md, paddingHorizontal: S[3] + 2,
    paddingVertical: S[3] - 1, ...T.h2, color: P.textPri, marginBottom: S[3],
  },
  pickLabel: { ...T.label, color: P.textSec, marginBottom: S[1] + 2 },
  ccyChip: {
    borderWidth: 1.5, borderColor: P.hairline, backgroundColor: P.card,
    paddingHorizontal: S[3], paddingVertical: 7, borderRadius: RA.pill, marginRight: S[1] + 2,
  },
  ccyChipText: { ...T.caption, fontFamily: F.bold, color: P.textPri },
  result: { ...T.h1, fontFamily: F.bold },
});
