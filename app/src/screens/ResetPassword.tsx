// Choosing a new password, after a recovery link.
//
// By the time this renders, the link has already been redeemed: Supabase
// validated the one-time token and handed back a real session, which
// adoptRecoverySession() stored. So the person is signed in BEFORE choosing a
// password. That is how Supabase recovery works and it is safe — controlling
// the mailbox was the proof, and the token is spent — but it means this screen
// must not be skippable: leaving without setting a password would strand
// someone signed in with a password they do not know.
//
// Hence no back button and no dismiss. The only ways out are setting a
// password, or the explicit "start over" on the failure path.
import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View,
} from 'react-native';

import { setPassword, signOut } from '../auth';
import { Btn, Card, Field } from '../components/ui';
import { F, P, S, T } from '../theme';

const MIN = 6;

function failureMessage(raw: string): string {
  const m = (raw || '').toLowerCase();
  if (m.includes('same as the old') || m.includes('should be different')) {
    return 'That is already your password — choose a different one.';
  }
  if (m.includes('weak') || (m.includes('password') && m.includes('6'))) {
    return `Passwords need at least ${MIN} characters.`;
  }
  if (m.includes('expired') || m.includes('invalid') || m.includes('401') || m.includes('403')) {
    return 'That reset link has expired. Request a new one and try again.';
  }
  if (m.includes("can't reach") || m.includes('network')) {
    return "Can't reach VoyageOS — check your connection.";
  }
  return 'Could not set your password. Please try again.';
}

export default function ResetPassword({ onDone, onStartOver }: {
  onDone: () => void;
  onStartOver: () => void;
}) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tooShort = pw.length > 0 && pw.length < MIN;
  const mismatch = confirm.length > 0 && pw !== confirm;
  const ready = pw.length >= MIN && pw === confirm && !busy;

  async function save() {
    setBusy(true); setError(null);
    try {
      await setPassword(pw);
      onDone();                       // already signed in — straight home
    } catch (e: any) {
      setError(failureMessage(e?.message ?? ''));
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }}
        contentContainerStyle={{ padding: S[5], paddingTop: S[8] }}
        keyboardShouldPersistTaps="handled">
        <Text style={{ ...T.h1, color: P.textPri }}>Choose a new password</Text>
        <Text style={{ ...T.body, color: P.textSec, marginTop: S[2], marginBottom: S[4] }}>
          You're signed in from the link in your email. Set a password to
          finish.
        </Text>

        <Card>
          <Field label={`NEW PASSWORD (${MIN}+ CHARACTERS)`} value={pw} onChange={setPw}
            placeholder="••••••••" secure
            textContentType="newPassword" autoComplete="password-new" />
          <Field label="CONFIRM PASSWORD" value={confirm} onChange={setConfirm}
            placeholder="••••••••" secure
            textContentType="newPassword" autoComplete="password-new" />

          {/* Said as you type rather than on submit — a mismatch you learn
              about after tapping means retyping both fields. */}
          {tooShort && (
            <Text style={{ ...T.caption, color: P.textMuted, marginBottom: S[2] }}>
              At least {MIN} characters.
            </Text>
          )}
          {mismatch && (
            <Text style={{ ...T.caption, color: P.danger, marginBottom: S[2] }}>
              Those don't match.
            </Text>
          )}
          {!!error && (
            <Text style={{ ...T.caption, color: P.danger, marginBottom: S[2] }}>{error}</Text>
          )}

          {busy
            ? <ActivityIndicator style={{ marginVertical: S[3] }} />
            : <Btn label="Set password and continue" disabled={!ready} onPress={save} />}
        </Card>

        {/* The way out when the link is dead. Signs out first: the adopted
            session is useless without a password they know, and leaving it in
            place would put them in the app in a state they cannot repeat. */}
        <Pressable
          onPress={async () => { await signOut(); onStartOver(); }}
          style={{ alignItems: 'center', paddingVertical: S[4] }}>
          <Text style={{ ...T.body, color: P.brand }}>Start over</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
