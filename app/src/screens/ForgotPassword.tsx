// Asking for a reset link.
//
// IT NEVER SAYS WHETHER THE ADDRESS EXISTS
//
// Success and "no such account" produce the identical message. A reset form
// that distinguishes them is an account-enumeration oracle — type addresses
// in, learn who has an account here. That matters more than usual for this
// app: an account implies travel plans and stored passport documents.
//
// The cost is real and worth paying: someone who mistypes their address gets a
// confident-sounding message and no email. The copy is therefore conditional
// rather than triumphant — "if that address has an account" — so a wrong
// address reads as a possibility rather than a promise broken.
import React, { useState } from 'react';
import {
  ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View,
} from 'react-native';

import { requestPasswordReset } from '../auth';
import { Btn, Card, Field } from '../components/ui';
import { RESET_REDIRECT } from '../deepLinkConfig';
import { F, P, S, T } from '../theme';

/** Failures worth naming. Everything else gets a plain fallback rather than a
 *  Supabase string on a screen someone reaches while already frustrated. */
function resetMessage(raw: string): string {
  const m = (raw || '').toLowerCase();
  if (m.includes('rate limit') || m.includes('over_email_send_rate') || m.includes('429')) {
    return 'Too many requests just now. Please wait a minute and try again.';
  }
  if (m.includes("can't reach") || m.includes('network') || m.includes('failed to fetch')) {
    return "Can't reach VoyageOS — check your connection.";
  }
  return 'Something went wrong. Please try again.';
}

export default function ForgotPassword({ email: initial, notice, onBack }: {
  email?: string;
  /** Why they were sent here — e.g. an expired link. Shown once, above the
   *  form, so a dead link explains itself instead of silently reopening this
   *  screen. */
  notice?: string | null;
  onBack: () => void;
}) {
  const [email, setEmail] = useState(initial ?? '');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send() {
    setBusy(true); setError(null);
    try {
      await requestPasswordReset(email.trim(), RESET_REDIRECT);
      setSent(true);
    } catch (e: any) {
      setError(resetMessage(e?.message ?? ''));
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }}
        contentContainerStyle={{ padding: S[5], paddingTop: S[8] }}
        keyboardShouldPersistTaps="handled">
        <Text style={{ ...T.h1, color: P.textPri }}>Reset your password</Text>

        {!!notice && !sent && (
          <Card>
            <Text style={{ ...T.body, color: P.textPri, fontFamily: F.med }}>
              That link didn't work
            </Text>
            <Text style={{ ...T.caption, color: P.textSec, marginTop: S[2] }}>
              {notice} Reset links work once and expire after an hour — request
              a fresh one below.
            </Text>
          </Card>
        )}

        {sent ? (
          <Card>
            <Text style={{ ...T.body, color: P.textPri, fontFamily: F.med }}>
              Check your email
            </Text>
            {/* Conditional on purpose — see the note at the top of this file. */}
            <Text style={{ ...T.body, color: P.textSec, marginTop: S[2] }}>
              If that address has an account, a reset link is on its way. The
              link works once and expires after an hour.
            </Text>
            <Text style={{ ...T.caption, color: P.textMuted, marginTop: S[3] }}>
              Nothing after a few minutes? Check spam, and confirm the address
              you typed.
            </Text>
            <Pressable onPress={() => { setSent(false); setError(null); }}
              style={{ marginTop: S[4] }}>
              <Text style={{ ...T.body, color: P.brand, fontFamily: F.med }}>
                Send to a different address ›
              </Text>
            </Pressable>
          </Card>
        ) : (
          <Card>
            <Text style={{ ...T.body, color: P.textSec, marginBottom: S[4] }}>
              Enter the email you signed up with and we'll send a link to
              choose a new password.
            </Text>
            <Field label="EMAIL" value={email} onChange={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address" textContentType="emailAddress"
              autoComplete="email" />
            {!!error && (
              <Text style={{ ...T.caption, color: P.danger, marginBottom: S[2] }}>{error}</Text>
            )}
            {busy
              ? <ActivityIndicator style={{ marginVertical: S[3] }} />
              : <Btn label="Send reset link" disabled={email.trim().length < 3} onPress={send} />}
          </Card>
        )}

        <Pressable onPress={onBack} style={{ alignItems: 'center', paddingVertical: S[4] }}>
          <Text style={{ ...T.body, color: P.brand }}>Back to sign in</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
