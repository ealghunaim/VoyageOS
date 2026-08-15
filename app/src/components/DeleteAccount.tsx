// Deleting your account, from inside the app.
//
// Required by App Review 5.1.1(v): an app that lets you create an account has
// to let you delete it in-app, not by emailing support. It is also simply
// right — an account you cannot leave is not really yours.
//
// THE SUBSCRIPTION WARNING IS NOT BOILERPLATE
//
// Deleting an account does NOT cancel an Apple subscription. Only Apple can,
// and we have no way to do it on someone's behalf. Someone who deletes their
// account assuming the billing stops would keep being charged for a service
// they can no longer reach — the worst outcome this screen can produce, and
// entirely preventable by saying so plainly and putting the cancel route one
// tap away. Apple requires the disclosure; it would be worth making anyway.
//
// The password is confirmed against Supabase directly and never reaches our
// API. Sessions persist for weeks, so a phone left unlocked should not be able
// to erase someone's travel history without proving who it is.
import React, { useState } from 'react';
import {
  ActivityIndicator, Linking, Modal, Pressable, ScrollView, Text, TextInput, View,
} from 'react-native';

import { deleteAccount } from '../api';
import { verifyPassword } from '../auth';
import { useSubscription } from '../subscription';
import { F, P, S, T } from '../theme';

const MANAGE_URL = 'itms-apps://apps.apple.com/account/subscriptions';

export default function DeleteAccount({ onDeleted }: { onDeleted: () => void }) {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sub = useSubscription();
  const paying = !!sub && sub.tier !== 'free';

  const close = () => { setOpen(false); setPassword(''); setError(null); };

  async function confirm() {
    setBusy(true); setError(null);
    // Password first: no point purging storage for someone who cannot prove
    // who they are, and a failed check must leave everything untouched.
    if (!(await verifyPassword(password))) {
      setBusy(false);
      setError('That password is not right.');
      return;
    }
    try {
      await deleteAccount();
      // The account is gone; the local session is now meaningless. onDeleted
      // signs out and returns to Login.
      onDeleted();
    } catch (e: any) {
      setBusy(false);
      // The server answers 503 with a plain sentence when the storage purge
      // could not finish — and in that case NOTHING was deleted, which is
      // what the message says. It is safe to try again.
      setError(e?.message ?? 'Could not delete your account. Please try again.');
    }
  }

  return (
    <>
      <Pressable onPress={() => setOpen(true)} style={{ alignItems: 'center', paddingVertical: S[4] }}>
        <Text style={{ ...T.caption, color: P.danger }}>Delete account</Text>
      </Pressable>

      <Modal visible={open} animationType="slide" onRequestClose={close}>
        <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }}
          contentContainerStyle={{ padding: S[5], paddingTop: S[8] }}>
          <Text style={{ ...T.h1, color: P.textPri }}>Delete account</Text>

          <Text style={{ ...T.body, color: P.textPri, marginTop: S[4], fontFamily: F.med }}>
            This cannot be undone.
          </Text>
          <Text style={{ ...T.body, color: P.textSec, marginTop: S[2] }}>
            Your trips, documents, photos, packing lists and saved places are
            permanently deleted. We cannot recover them afterwards, and neither
            can you.
          </Text>

          {/* Shown to everyone, not only current subscribers: someone who
              cancelled but is still inside a paid period is exactly the person
              most likely to assume deleting the account settles it. */}
          <View style={{ marginTop: S[5], padding: S[4], borderRadius: 14,
                         backgroundColor: P.card, borderWidth: 1, borderColor: P.hairline }}>
            <Text style={{ ...T.body, color: P.textPri, fontFamily: F.med }}>
              This does not cancel your subscription
            </Text>
            <Text style={{ ...T.caption, color: P.textSec, marginTop: S[2] }}>
              Subscriptions are billed by Apple, and only Apple can cancel
              them. If you do not cancel, you will keep being charged after
              your account is gone.
            </Text>
            <Pressable onPress={() => Linking.openURL(MANAGE_URL).catch(() => {})}
              style={{ marginTop: S[3] }}>
              <Text style={{ ...T.body, color: P.brand, fontFamily: F.med }}>
                Manage subscription ›
              </Text>
            </Pressable>
            {paying && (
              <Text style={{ ...T.caption, color: P.danger, marginTop: S[2] }}>
                You are currently on {sub!.tier_label}. Cancel there first.
              </Text>
            )}
          </View>

          <Text style={{ ...T.label, color: P.textMuted, marginTop: S[6], marginBottom: S[2] }}>
            CONFIRM YOUR PASSWORD
          </Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            placeholder="Password"
            placeholderTextColor={P.textMuted}
            style={{ ...T.body, color: P.textPri, backgroundColor: P.card,
                     borderRadius: 12, padding: S[3], borderWidth: 1, borderColor: P.hairline }}
          />
          {!!error && (
            <Text style={{ ...T.caption, color: P.danger, marginTop: S[2] }}>{error}</Text>
          )}

          <Pressable
            onPress={confirm}
            disabled={busy || password.length === 0}
            style={{ marginTop: S[5], paddingVertical: 14, borderRadius: 12,
                     alignItems: 'center', backgroundColor: P.danger,
                     opacity: busy || !password ? 0.5 : 1 }}>
            {busy ? <ActivityIndicator color={P.card} />
                  : <Text style={{ ...T.title, color: P.card }}>Delete my account</Text>}
          </Pressable>

          <Pressable onPress={close} disabled={busy}
            style={{ alignItems: 'center', paddingVertical: S[4] }}>
            <Text style={{ ...T.body, color: P.brand }}>Keep my account</Text>
          </Pressable>
        </ScrollView>
      </Modal>
    </>
  );
}
