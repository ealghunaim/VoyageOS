import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Alert, Image, Modal, Pressable, ScrollView,
  StyleSheet, Text, TextInput, View,
} from 'react-native';
import {
  createDocument, deleteDocument, deleteDocumentPhoto, Doc, getDocumentPhoto,
  listDocuments, patchDocument, revealDocumentNumber, uploadDocumentPhoto,
} from '../api';
import * as ImagePicker from 'expo-image-picker';
import { deviceTz } from '../notifications';
import { Btn, Card, Chip } from '../components/ui';
import { F, P, RA, S, T } from '../theme';
import { FAB_CLEARANCE } from '../components/TopBar';
import { confirmDelete } from '../confirms';
import { isEnabled, unlock } from '../biometric';

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
  expiry: string; country: string; notes: string; number: string;
};

const EMPTY: Draft = {
  id: null, type: 'passport', label: '', expiry: '', country: '', notes: '', number: '',
};

/** Types where a number is the point of storing the document at all. */
const WANTS_NUMBER = new Set(['passport', 'visa', 'driving_license', 'insurance']);

export default function Documents() {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [d, setD] = useState<Draft>(EMPTY);
  const [busy, setBusy] = useState(false);
  // A revealed number is held for one document at a time and dropped as soon
  // as the list reloads or another is revealed — it should not accumulate in
  // memory behind a screen the traveller has moved on from.
  const [revealed, setRevealed] = useState<{ id: string; number: string } | null>(null);
  const [photoFor, setPhotoFor] = useState<string | null>(null);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const load = useCallback(async () => {
    setRevealed(null);
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
        // Only sent when typed. An untouched field must not clear a stored
        // number, so the key is omitted entirely rather than sent as null.
        ...(d.number.trim() ? { number: d.number.trim() } : {}),
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
      // Never prefilled: the ciphertext does not come down with the list, and
      // silently re-sending a blank would wipe a stored number. Blank means
      // "leave it alone"; the Clear action is how you remove one.
      number: '',
    });
  }

  async function reveal(doc: Doc) {
    if (revealed?.id === doc.id) { setRevealed(null); return; }   // tap again to hide

    // FACE ID GATES THE NUMBER, not the screen. The list is expiry dates and
    // labels — useful, and not what anyone is protecting. The passport number
    // is the sensitive surface, so the gate sits at the moment it would be
    // shown rather than at the door to the room.
    if (await isEnabled()) {
      const r = await unlock();
      if (r === 'cancelled') return;          // a decision, not a failure: say nothing
      if (r === 'unavailable') {
        // Biometrics vanished after this was switched on — re-enrolment, or a
        // restore onto another phone. unlock() has already turned the toggle
        // off; insisting here would lock someone out of their own passport
        // number with no way back short of reinstalling.
        Alert.alert('Face ID unavailable',
          'Face ID is no longer set up on this device, so document protection has '
          + 'been switched off. You can turn it back on in Profile.');
      }
    }

    try {
      const r = await revealDocumentNumber(doc.id);
      setRevealed({ id: doc.id, number: r.number });
    } catch (e: any) { Alert.alert('Reveal', e.message); }
  }

  async function pickPhoto(docId: string) {
    const r = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], quality: 0.5, base64: true,
    });
    const a = r.assets?.[0];
    if (r.canceled || !a?.base64) return;
    setPhotoBusy(true);
    try {
      await uploadDocumentPhoto(docId, a.base64, a.mimeType ?? 'image/jpeg');
      await load();
    } catch (e: any) { Alert.alert('Photo', e.message); }
    finally { setPhotoBusy(false); }
  }

  async function viewPhoto(docId: string) {
    setPhotoFor(docId); setPhotoUri(null); setPhotoBusy(true);
    try {
      // Decrypted server-side and streamed; what comes back are bytes, held
      // only in memory for as long as the viewer is open.
      setPhotoUri(await getDocumentPhoto(docId));
    } catch (e: any) {
      setPhotoFor(null); Alert.alert('Photo', e.message);
    } finally { setPhotoBusy(false); }
  }

  const title = (doc: Doc) =>
    doc.label || (doc.type === 'visa' && doc.country_code
      ? `${doc.country_code} visa`
      : TYPE_LABEL[doc.type] ?? doc.type);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={s.wrap}>
      {/* No back link: this is a tab root, and the tab bar is the way
          between it and the others. A "‹ Home" here would point sideways. */}
      <View style={s.header}>
        <Text style={s.h2}>Documents</Text>
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
                confirmDelete('document', title(doc), async () => {
                  try { await deleteDocument(doc.id); if (d.id === doc.id) setD(EMPTY); load(); }
                  catch (e: any) { Alert.alert('Error', e.message); }
                })}>
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

            {(doc.has_number || doc.has_photo) && (
              <View style={s.secureRow}>
                {doc.has_number && (
                  <Pressable hitSlop={8} onPress={() => reveal(doc)}>
                    <Text style={s.masked}>
                      {revealed?.id === doc.id
                        ? revealed.number
                        : `•••• ${doc.number_last4 ?? '····'}`}
                      <Text style={s.revealHint}>
                        {revealed?.id === doc.id ? '   hide' : '   reveal'}
                      </Text>
                    </Text>
                  </Pressable>
                )}
                {doc.has_photo && (
                  <Pressable hitSlop={8} onPress={() => viewPhoto(doc.id)}>
                    <Text style={s.photoLink}>View photo</Text>
                  </Pressable>
                )}
              </View>
            )}

            <View style={s.secureRow}>
              <Pressable hitSlop={8} onPress={() => pickPhoto(doc.id)}>
                <Text style={s.photoLink}>
                  {doc.has_photo ? 'Replace photo' : 'Add photo'}
                </Text>
              </Pressable>
              {doc.has_photo && (
                <Pressable hitSlop={8} onPress={() =>
                  confirmDelete('photo', title(doc), async () => {
                    try { await deleteDocumentPhoto(doc.id); load(); }
                    catch (e: any) { Alert.alert('Photo', e.message); }
                  }, { verb: 'Remove' })}>
                  <Text style={s.removeLink}>Remove photo</Text>
                </Pressable>
              )}
            </View>
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
        {WANTS_NUMBER.has(d.type) && (
          <>
            <Text style={s.fieldLabel}>
              {editing ? 'Document number — leave blank to keep the stored one' : 'Document number'}
            </Text>
            <TextInput
              style={s.input} value={d.number} onChangeText={t => set('number', t)}
              placeholder={editing ? 'Unchanged' : 'e.g. X1234567'}
              placeholderTextColor={P.textMuted}
              autoCapitalize="characters" autoCorrect={false}
              // No autofill, no suggestion bar, no keyboard learning: this is
              // the one field on the screen that must not be remembered.
              textContentType="none" autoComplete="off" spellCheck={false} />
            <Text style={s.secureNote}>
              Encrypted before it leaves your phone's reach. Only the last four
              digits are shown in this list.
            </Text>
          </>
        )}

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
        Numbers and photos are encrypted with a key only your account can use.
      </Text>

      <Modal visible={!!photoFor} transparent animationType="fade"
             onRequestClose={() => { setPhotoFor(null); setPhotoUri(null); }}>
        <Pressable style={s.viewerBack}
                   onPress={() => { setPhotoFor(null); setPhotoUri(null); }}>
          {photoBusy && !photoUri && <ActivityIndicator size="large" color={P.textOnDark} />}
          {!!photoUri && (
            <Image source={{ uri: photoUri }} style={s.viewerImg} resizeMode="contain" />
          )}
          <Text style={s.viewerHint}>Tap anywhere to close</Text>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: S[4], paddingTop: S[6] , paddingBottom: FAB_CLEARANCE },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: S[3] },
  back: { ...T.title, color: P.brand },
  h2: { ...T.h2, color: P.textPri },
  name: { ...T.title, color: P.textPri },
  sub: { ...T.caption, color: P.textSec, marginTop: 2 },
  status: { ...T.caption, fontFamily: F.med, marginTop: S[1] },
  notes: { ...T.caption, color: P.textMuted, marginTop: S[1] },
  secureRow: { flexDirection: 'row', alignItems: 'center', marginTop: S[2], flexWrap: 'wrap' },
  // Monospaced so the digits line up between the masked and revealed states
  // and the row does not jump when it changes.
  masked: { ...T.body, fontFamily: 'Courier', color: P.textPri, marginRight: S[4] },
  revealHint: { ...T.caption, fontFamily: F.med, color: P.brand },
  photoLink: { ...T.caption, fontFamily: F.med, color: P.brand, marginRight: S[4] },
  removeLink: { ...T.caption, fontFamily: F.med, color: P.textSec },
  secureNote: { ...T.caption, color: P.textMuted, marginTop: -S[2], marginBottom: S[3] },
  viewerBack: {
    flex: 1, backgroundColor: 'rgba(13,24,42,0.94)',
    alignItems: 'center', justifyContent: 'center', padding: S[5],
  },
  viewerImg: { width: '100%', height: '80%' },
  viewerHint: { ...T.caption, color: P.textMuted, marginTop: S[4] },
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
