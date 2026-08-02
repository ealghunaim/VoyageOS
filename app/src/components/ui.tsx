import React from 'react';
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
        s.btn, { backgroundColor: bg },
        kind === 'primary' && E.mid,
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.85 },
      ]}
    >
      <Text style={[s.btnText, kind === 'ghost' && { color: P.brand }]}>{label}</Text>
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

export function Field({ label, value, onChange, placeholder }: {
  label: string; value: string; onChange: (t: string) => void; placeholder?: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.fieldLabel}>{label}</Text>
      <TextInput
        style={s.input}
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={P.textMuted}
        autoCapitalize="none"
      />
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
