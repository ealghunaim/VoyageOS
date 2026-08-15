import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { F, P, S, RA, E, T } from '../theme';

export function Btn({ label, onPress, kind = 'primary', disabled = false, color }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean; color?: string;
}) {
  const bg = kind === 'ghost' ? P.brandWash : (color ?? P.brand);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn,
        // Disabled goes neutral rather than translucent brand. Fading #1B2CFB
        // to 45% over a white card composites to #98A0FD — a periwinkle that
        // reads as a different brand colour rather than as an inactive
        // control, and it is the first thing shown on Login because the form
        // starts empty. Inert should look inert, not lavender.
        { backgroundColor: disabled ? P.sunken : bg },
        kind === 'primary' && !disabled && E.mid,
        pressed && !disabled && { opacity: 0.85 },
      ]}
    >
      <Text style={[
        s.btnText,
        kind === 'ghost' && { color: P.brand },
        disabled && { color: P.textMuted },
      ]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  // E.mid, not E.low: on sparse screens (SOS, Journal) a card against
  // P.pageBg needs real lift, and the hairline border alone was not enough.
  return <View style={[s.card, E.mid, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress, color }: {
  label: string; selected: boolean; onPress: () => void; color?: string;
}) {
  const on = color ?? P.brand;
  return (
    <Pressable onPress={onPress} style={[s.chip, selected && { backgroundColor: on, borderColor: on }]}>
      <Text style={[s.chipText, selected && { color: P.textOnDark }]}>{label}</Text>
    </Pressable>
  );
}

export function Field({ label, value, onChange, placeholder, secure, keyboardType,
                        textContentType, autoComplete }: {
  label: string; value: string; onChange: (t: string) => void; placeholder?: string;
  /** Masks the value and adds a reveal toggle. Off by default: only the
   *  caller knows whether a field is a secret. */
  secure?: boolean;
  keyboardType?: 'default' | 'email-address';
  textContentType?: 'emailAddress' | 'password' | 'newPassword' | 'none';
  autoComplete?: 'email' | 'password' | 'password-new' | 'off';
}) {
  // Hidden by default, revealable on request. A password typed in the clear on
  // a phone is readable by anyone beside you, and this screen is the one place
  // people type a password in public — on a plane, in a queue. The toggle
  // exists because masking without one makes a typo on a phone keyboard
  // unfixable except by retyping the whole thing.
  const [reveal, setReveal] = useState(false);
  const masked = !!secure && !reveal;

  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <View style={{ position: 'relative', justifyContent: 'center' }}>
        <TextInput
          style={[s.input, secure && { paddingRight: 52 }]}
          value={value}
          onChangeText={onChange}
          placeholder={placeholder}
          placeholderTextColor={P.textMuted}
          autoCapitalize="none"
          autoCorrect={false}
          spellCheck={false}
          secureTextEntry={masked}
          keyboardType={keyboardType}
          textContentType={textContentType}
          autoComplete={autoComplete}
        />
        {secure && (
          <Pressable
            onPress={() => setReveal(r => !r)}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={masked ? 'Show password' : 'Hide password'}
            style={{ position: 'absolute', right: 14 }}>
            <Text style={{ fontSize: 16 }}>{masked ? '👁' : '🙈'}</Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: color ?? P.brand }]} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: { borderRadius: RA.md, paddingVertical: S[4], alignItems: 'center' },
  btnText: { ...T.title, color: P.textOnDark, letterSpacing: 0.2 },
  card: {
    backgroundColor: P.card, borderRadius: RA.xl, padding: S[5],
    borderWidth: 1, borderColor: P.hairline, marginBottom: S[3],
  },
  chip: {
    borderWidth: 1, borderColor: P.hairlineStrong, backgroundColor: P.card,
    paddingHorizontal: S[4], paddingVertical: S[2] + 2, borderRadius: RA.pill, margin: S[1],
  },
  chipText: { ...T.caption, fontFamily: F.med, color: P.textPri },
  fieldLabel: { ...T.label, color: P.textMuted, marginBottom: S[2] },
  input: {
    ...T.body, backgroundColor: P.sunken, borderRadius: RA.md,
    paddingHorizontal: S[4], paddingVertical: S[3] + 2, color: P.textPri,
  },
  track: { height: 8, borderRadius: 4, backgroundColor: P.hairline, overflow: 'hidden' },
  fill: { height: 8 },
});
