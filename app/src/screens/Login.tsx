import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { signIn, signUp } from '../auth';
import { Btn, Card, Field } from '../components/ui';
import { C } from '../theme';

export default function Login({ onDone }: { onDone: () => void }) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  async function go() {
    setBusy(true); setMsg('');
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
      setMsg(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1, backgroundColor: C.bg }} contentContainerStyle={s.wrap}
        keyboardShouldPersistTaps="handled">
        <Text style={s.brand}>VoyageOS</Text>
        <Text style={s.tag}>It knows your trip better than you do.</Text>
        <Card>
          <Text style={s.h2}>{mode === 'signin' ? 'Sign in' : 'Create your account'}</Text>
          <Field label="EMAIL" value={email} onChange={setEmail} placeholder="you@example.com" />
          <Field label="PASSWORD (6+ CHARACTERS)" value={pw} onChange={setPw} placeholder="••••••••" />
          {!!msg && <Text style={s.msg}>{msg}</Text>}
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
  wrap: { padding: 16, paddingTop: 64 },
  brand: { fontSize: 30, fontWeight: '900', color: C.blue, marginBottom: 2 },
  tag: { color: C.sub, marginBottom: 18 },
  h2: { fontSize: 20, fontWeight: '800', color: C.text, marginBottom: 12 },
  msg: { color: C.red, marginBottom: 10, lineHeight: 19 },
  swap: { color: C.blue, fontWeight: '700', textAlign: 'center', marginTop: 14 },
  foot: { color: '#9aa7b8', textAlign: 'center', marginTop: 14, fontSize: 12 },
});
