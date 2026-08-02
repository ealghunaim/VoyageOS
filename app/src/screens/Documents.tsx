import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { createDocument, deleteDocument, Doc, listDocuments, patchDocument } from '../api';
import { deviceTz } from '../notifications';
import { Btn, Card, Chip } from '../components/ui';
import { F, P, RA, S, T } from '../theme';

const TYPES = [
  ['passport', 'Passport'], ['visa', 'Visa'], ['insurance', 'Insurance'],
  ['driving_license', 'Driving licence'], ['vaccination', 'Vaccination'],
  ['permit', 'Permit'], ['other', 'Other'],
] as const;

const TYPE_LABEL: Record<string, string> = Object.fromEntries(TYPES);

/**
 * Expiry status colour, on the condition-colour rule: red is an error, amber
 * is a caution, and anything not yet worth acting on stays neutral.
 *
 * `critical` and `expired` used to share one red, which made a passport with
 * five months left look identical to one that had already lapsed — the first
 * is a task, the second is a problem.
 */
const LEVEL_COLOR: Record<string, string> = {
  expired:  P.danger,      // it has lapsed
  critical: P.warningInk,  // under 6 months — the validity rule most countries apply
  soon:     P.textSec,     // under a year — worth knowing, not worth alarming
  ok:       P.textSec,
  none:     P.textMuted,
};

/** Reminder offsets the server schedules, mirrored for the "what happens next" line. */
const OFFSETS: Record<string, number[]> = {
  passport: [180], visa: [60, 30, 7], insurance: [30, 7],
  driving_license: [30], vaccination: [30], permit: [30],
};

type Draft = {
  id: string | null; type: string; label: string;
  expiry: string; country: string; notes: string;
};

const EMPTY: Draft = { id: null, type: 'passport', label: '', expiry: '', country: '', notes: '' };

export default function Documents({ onBack }: { onBack: () => void }) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try { setDocs(await listDocuments()); } catch (e: any) { Alert.alert('Error', e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD(p => ({ ...p, [k]: v }));
  const editing = d.id !== null;
  const dateOk = !d.expiry || /^\d{4}-\d{2}-\d{2}$/.test(d.expiry);
  // A visa is identified by the country it is for, so that stands in for a label.
  const named = !!d.label.trim() || (d.type === 'visa' && d.country.trim().length === 2);

  async function save() {
    setBusy(true);
    try {
      const body = {
        type: d.type,
        label: d.label.trim() || null,
        expiry_date: /^\d{4}-\d{2}-\d{2}$/.test(d.expiry) ? d.expiry : null,
        country_code: d.type === 'visa' && d.country.trim() ? d.country.trim().toUpperCase() : null,
        notes: d.notes.trim() || null,
        tz: deviceTz(),
      };
      const saved = editing ? await patchDocument(d.id!, body) : await createDocument(body);
      setD(EMPTY);
      await load();
      if (saved.reminders) {
        Alert.alert('Saved', `${saved.reminders} renewal reminder${saved.reminders > 1 ? 's' : ''} scheduled.`);
      }
    } catch (e: any) { Alert.alert('Error', e.message); }
    finally { setBusy(false); }
  }

  function edit(doc: Doc) {
    setD({
      id: doc.id, type: doc.type, label: doc.label ?? '',
      expiry: doc.expiry_date ?? '', country: doc.country_code ?? '',
      notes: doc.notes ?? '',
    });
  }

  const title = (doc: Doc) =>
    doc.label || (doc.type === 'visa' && doc.country_code
      ? `${doc.country_code} visa`
      : TYPE_LABEL[doc.type] ?? doc.type);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={s.wrap}>
      <View style={s.header}>
        <Pressable onPress={onBack} hitSlop={10}><Text style={s.back}>‹ Home</Text></Pressable>
        <Text style={s.h2}>Documents</Text>
        <View style={{ width: S[12] }} />
      </View>

      {docs.length === 0 && (
        <Card>
          <Text style={s.sub}>
            Nothing tracked yet. Add a passport or visa and VoyageOS will remind you
            while renewing is still easy.
          </Text>
        </Card>
      )}

      {docs.map(doc => (
        <Pressable key={doc.id} onPress={() => edit(doc)}>
          <Card style={d.id === doc.id ? { borderColor: P.brand, borderWidth: 1 } : undefined}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={s.name}>{title(doc)}</Text>
              <Pressable hitSlop={10} onPress={() =>
                Alert.alert('Delete document?', title(doc), [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete', style: 'destructive',
                    onPress: async () => {
                      try { await deleteDocument(doc.id); if (d.id === doc.id) setD(EMPTY); load(); }
                      catch (e: any) { Alert.alert('Error', e.message); }
                    } },
                ])}>
                <Text style={s.x}>✕</Text>
              </Pressable>
            </View>
            <Text style={s.sub}>
              {TYPE_LABEL[doc.type] ?? doc.type}
              {doc.type === 'visa' && doc.country_code ? ` · for ${doc.country_code}` : ''}
            </Text>
            <Text style={[s.status, { color: LEVEL_COLOR[doc.expiry.level] ?? P.textSec }]}>
              {doc.expiry.message}
            </Text>
            {!!doc.notes && <Text style={s.notes}>{doc.notes}</Text>}
          </Card>
        </Pressable>
      ))}

      <Card>
        <Text style={s.q}>{editing ? 'Edit document' : 'Add a document'}</Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: S[2] }}>
          {TYPES.map(([v, l]) => (
            <Chip key={v} label={l} selected={d.type === v} onPress={() => set('type', v)} />
          ))}
        </View>

        {d.type === 'visa' && (
          <>
            <Text style={s.fieldLabel}>Which country is this visa for?</Text>
            <TextInput style={s.input} value={d.country}
              onChangeText={t => set('country', t.toUpperCase().slice(0, 2))}
              placeholder="Country code, e.g. JP" placeholderTextColor={P.textMuted}
              autoCapitalize="characters" maxLength={2} />
          </>
        )}

        <TextInput style={s.input} value={d.label} onChangeText={t => set('label', t)}
          placeholder={d.type === 'visa' ? 'Label (optional)' : 'Label (optional, e.g. My passport)'}
          placeholderTextColor={P.textMuted} />
        <TextInput style={[s.input, !dateOk && { borderColor: P.danger }]}
          value={d.expiry} onChangeText={t => set('expiry', t)}
          placeholder="Expiry YYYY-MM-DD" placeholderTextColor={P.textMuted} autoCapitalize="none" />
        {!dateOk && <Text style={s.err}>Use YYYY-MM-DD, e.g. 2029-04-30.</Text>}
        <TextInput style={[s.input, s.notesInput]} value={d.notes} onChangeText={t => set('notes', t)}
          placeholder="Notes (optional)" placeholderTextColor={P.textMuted} multiline />

        <Text style={s.hint}>
          {OFFSETS[d.type]?.length
            ? `Reminders at ${OFFSETS[d.type].map(n => (n >= 180 ? '6 months' : `${n} days`)).join(', ')} before expiry.`
            : 'No renewal reminders for this type.'}
        </Text>

        <Btn label={editing ? 'Save changes' : 'Save'} disabled={busy || !named || !dateOk} onPress={save} />
        {editing && (
          <Pressable onPress={() => setD(EMPTY)}>
            <Text style={s.cancel}>Cancel edit</Text>
          </Pressable>
        )}
      </Card>

      <Text style={s.foot}>
        Expiry tracking only. VoyageOS does not store document numbers or scans.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: S[4], paddingTop: S[6] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S[3] },
  back: { ...T.title, color: P.brand },
  h2: { ...T.h2, color: P.textPri },
  name: { ...T.title, color: P.textPri },
  sub: { ...T.caption, color: P.textSec, marginTop: 2 },
  status: { ...T.caption, fontFamily: F.med, marginTop: S[1] },
  notes: { ...T.caption, color: P.textMuted, marginTop: S[1] },
  x: { ...T.title, fontFamily: F.reg, color: P.textSec },
  q: { ...T.h2, color: P.textPri, marginBottom: S[2] },
  fieldLabel: { ...T.caption, color: P.textSec, marginBottom: S[1] },
  input: {
    borderWidth: 1, borderColor: P.hairline, borderRadius: RA.md, backgroundColor: P.card,
    paddingHorizontal: S[4], paddingVertical: S[3], ...T.body, color: P.textPri, marginBottom: S[3],
  },
  notesInput: { minHeight: 64, textAlignVertical: 'top' },
  err: { ...T.caption, color: P.danger, marginTop: -S[2], marginBottom: S[3] },
  hint: { ...T.caption, color: P.textMuted, marginBottom: S[3] },
  cancel: { ...T.caption, color: P.textSec, textAlign: 'center', marginTop: S[3] },
  foot: { ...T.caption, color: P.textMuted, textAlign: 'center', marginTop: S[3] },
});
