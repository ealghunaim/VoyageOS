import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { getPhrases, Phrase, Trip } from '../api';
import { CURRENCIES, currencyForCountry, getRate } from '../fx';
import { C, F, tint } from '../theme';

export default function TripExtras({ trip, accent }: { trip: Trip; accent: string }) {
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
    <View style={{ marginBottom: 12 }}>
      <View style={{ flexDirection: 'row' }}>
        <Pressable onPress={() => setOpen(open === 'phrases' ? null : 'phrases')}
          style={[s.sq, { marginRight: 10 }, open === 'phrases' && { borderColor: accent, backgroundColor: tint(accent, 0.06) }]}>
          <Text style={s.emoji}>🗣️</Text>
          <Text style={s.sqLabel}>Phrases</Text>
        </Pressable>
        <Pressable onPress={() => setOpen(open === 'money' ? null : 'money')}
          style={[s.sq, open === 'money' && { borderColor: accent, backgroundColor: tint(accent, 0.06) }]}>
          <Text style={s.emoji}>💱</Text>
          <Text style={s.sqLabel}>Currency</Text>
        </Pressable>
      </View>

      {open === 'phrases' && (
        <View style={s.panel}>
          {pBusy && <ActivityIndicator color={accent} />}
          {!!phrases && phrases.phrases.length > 0 && (
            <>
              {!!phrases.language && <Text style={[s.lang, { color: accent }]}>{phrases.language}</Text>}
              {phrases.phrases.map((p, i) => (
                <View key={i} style={[{ paddingVertical: 8 }, i > 0 && { borderTopWidth: 1, borderTopColor: C.border }]}>
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
                <Text style={[s.ccyChipText, c === fromCcy && { color: '#fff' }]}>{c}</Text>
              </Pressable>
            ))}
          </ScrollView>
          <Text style={s.pickLabel}>TO</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 4 }}>
            {ordered(toCcy).map(c => (
              <Pressable key={c} onPress={() => setToCcy(c)}
                style={[s.ccyChip, c === toCcy && { backgroundColor: accent, borderColor: accent }]}>
                <Text style={[s.ccyChipText, c === toCcy && { color: '#fff' }]}>{c}</Text>
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
  sq: { flex: 1, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1.5, borderColor: C.border, paddingVertical: 12, alignItems: 'center' },
  emoji: { fontSize: 22 },
  sqLabel: { marginTop: 4, color: C.text, fontFamily: F.bold, fontSize: 13 },
  panel: { backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: C.border, padding: 14, marginTop: 10 },
  lang: { fontFamily: F.bold, fontSize: 13, marginBottom: 4 },
  local: { color: C.text, fontSize: 17, fontFamily: F.bold },
  en: { color: C.sub, fontSize: 13, marginTop: 1 },
  note: { color: '#9AA9BB', fontSize: 12, marginTop: 8 },
  amt: { backgroundColor: '#F1F4F9', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, fontSize: 18, fontFamily: F.bold, color: C.text, marginBottom: 10 },
  pickLabel: { color: C.sub, fontSize: 11, fontFamily: F.bold, letterSpacing: 0.6, marginBottom: 6 },
  ccyChip: { borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff', paddingHorizontal: 12, paddingVertical: 7, borderRadius: 999, marginRight: 6 },
  ccyChipText: { color: C.text, fontFamily: F.bold, fontSize: 13 },
  result: { fontSize: 26, fontFamily: F.bold },
});
