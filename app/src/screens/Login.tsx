import React, { useEffect, useRef, useState } from 'react';
import {
  Animated, Image, KeyboardAvoidingView, Platform, Pressable,
  ScrollView, StyleSheet, Text, View,
} from 'react-native';
import { signIn, signUp } from '../auth';
import { Btn, Card, Field } from '../components/ui';
import { F, P, S, T } from '../theme';

/**
 * The stacked lockup carries the tagline in the brand's own lettering, so the
 * screen shows one logo rather than a mark, a re-typed name and a re-typed
 * tagline in three different faces. ASPECT is measured from the artwork's
 * alpha bounds.
 */
const LOCKUP_ASPECT = 1.2390;   // 2587 x 2088, trimmed

/** Turn an auth failure into something worth reading.
 *
 *  Raw Supabase strings were being shown verbatim, which is how a tester was
 *  told "email rate limit exceeded" when what had actually happened was that
 *  they already had an account. Signing up with an existing email takes an
 *  email-sending path (Supabase does this so the response cannot be used to
 *  enumerate accounts), and that path is rate-limited — so the message
 *  describes our infrastructure rather than their situation.
 *
 *  Known cases are named; everything else gets a plain fallback rather than
 *  leaking internals onto the first screen of the app.
 */
function authMessage(raw: string, mode: 'signin' | 'signup'):
    { text: string; offerSignIn?: boolean } {
  const m = (raw || '').toLowerCase();

  if (mode === 'signup' && (m.includes('already registered')
      || m.includes('already exists')
      || m.includes('email rate limit exceeded'))) {
    return { text: 'This email already has an account.', offerSignIn: true };
  }
  if (m.includes('invalid login credentials')) {
    return { text: 'That email or password is not right.' };
  }
  if (m.includes('email rate limit exceeded') || m.includes('over_email_send_rate')) {
    return { text: 'Too many attempts just now. Please wait a minute and try again.' };
  }
  if (m.includes('password') && m.includes('6')) {
    return { text: 'Passwords need at least 6 characters.' };
  }
  if (m.includes("can't reach") || m.includes('network')) {
    return { text: "Can't reach VoyageOS — check your connection." };
  }
  return { text: 'Something went wrong. Please try again.' };
}

export default function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  // Set when the message should come with a way out, not just an apology.
  const [offerSignIn, setOfferSignIn] = useState(false);
  const [busy, setBusy] = useState(false);

  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 800, useNativeDriver: true }).start();
  }, [fade]);

  async function go() {
    setBusy(true); setMsg(''); setOfferSignIn(false);
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), pw);
        onDone();
      } else {
        const r = await signUp(email.trim(), pw);
        if (r === 'authed') onDone();
        else setMsg('Account created — confirm via the email we sent, then sign in.');
      }
    } catch (e: any) {
      const { text, offerSignIn: offer } = authMessage(e?.message ?? '', mode);
      setMsg(text);
      setOfferSignIn(!!offer);
    } finally {
      setBusy(false);
    }
  }

  const LOCKUP_H = 132;
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: P.pageBg }} contentContainerStyle={s.wrap}
        keyboardShouldPersistTaps="handled">
        <Animated.View style={[s.hero, { opacity: fade }]}>
          {/* @ts-ignore — image module typing lives in the Expo project */}
          <Image
            source={require('../../assets/lockup.png')}
            style={{ width: LOCKUP_H * LOCKUP_ASPECT, height: LOCKUP_H }}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="VoyageOS — Voyage. Optimized."
          />
        </Animated.View>

        <Card>
          <Text style={s.h2}>{mode === 'signin' ? 'Sign in' : 'Create your account'}</Text>
          <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@example.com"
            keyboardType="email-address" textContentType="emailAddress" autoComplete="email" />
          <Field label="PASSWORD (6+ CHARACTERS)" value={pw} onChange={setPw} placeholder="••••••••"
            secure
            textContentType={mode === 'signup' ? 'newPassword' : 'password'}
            autoComplete={mode === 'signup' ? 'password-new' : 'password'} />
          {!!msg && <Text style={s.msg}>{msg}</Text>}
          {offerSignIn && (
            <Pressable onPress={() => { setMode('signin'); setMsg(''); setOfferSignIn(false); }}>
              <Text style={[s.swap, { marginTop: 0, marginBottom: 8 }]}>Sign in instead ›</Text>
            </Pressable>
          )}
          <Btn
            label={busy ? 'One moment…' : mode === 'signin' ? 'Sign in' : 'Create account'}
            disabled={busy || !email.trim() || pw.length < 6}
            onPress={go}
          />
          <Pressable onPress={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMsg(''); }}>
            <Text style={s.swap}>
              {mode === 'signin' ? 'New here? Create an account' : 'Have an account? Sign in'}
            </Text>
          </Pressable>
        </Card>
        <Text style={s.foot}>Your session lives in this phone's secure keychain.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  wrap: { padding: S[4], paddingTop: S[12] + S[4] },
  hero: { alignItems: 'center', marginBottom: S[8] },
  h2: { ...T.h1, color: P.textPri, marginBottom: S[3] },
  // An auth failure is an error condition, not a destructive action — red is right here.
  msg: { ...T.body, color: P.danger, marginBottom: S[3] },
  swap: { ...T.title, fontFamily: F.med, color: P.brand, textAlign: 'center', marginTop: S[4] },
  foot: { ...T.caption, color: P.textMuted, textAlign: 'center', marginTop: S[4] },
});
