import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C, R, SHADOW, F } from '../theme';

export function Btn({ label, onPress, kind = 'primary', disabled = false, color }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean; color?: string;
}) {
  const bg = kind === 'ghost' ? C.blueSoft : (color ?? C.blue);
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        s.btn, { backgroundColor: bg },
        kind === 'primary' && SHADOW,
        (disabled || pressed) && { opacity: disabled ? 0.45 : 0.85 },
      ]}
    >
      <Text style={[s.btnText, kind === 'ghost' && { color: C.blue }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return <View style={[s.card, SHADOW, style]}>{children}</View>;
}

export function Chip({ label, selected, onPress, color }: {
  label: string; selected: boolean; onPress: () => void; color?: string;
}) {
  const on = color ?? C.blue;
  return (
    <Pressable onPress={onPress} style={[s.chip, selected && { backgroundColor: on, borderColor: on }]}>
      <Text style={[s.chipText, selected && { color: '#fff' }]}>{label}</Text>
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
        placeholderTextColor="#9AA9BB"
        autoCapitalize="none"
      />
    </View>
  );
}

export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.round(value * 100)}%`, backgroundColor: color ?? C.blue }]} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: { borderRadius: R.btn, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontFamily: F.bold, fontSize: 16, letterSpacing: 0.2 },
  card: {
    backgroundColor: C.card, borderRadius: R.card, padding: 18,
    borderWidth: 1, borderColor: C.border, marginBottom: 14,
  },
  chip: {
    borderWidth: 1.5, borderColor: C.border, backgroundColor: '#fff',
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: R.chip, margin: 4,
  },
  chipText: { color: C.text, fontFamily: F.med },
  fieldLabel: { color: C.sub, fontSize: 12, marginBottom: 7, fontFamily: F.bold, letterSpacing: 0.6 },
  input: {
    backgroundColor: '#F1F4F9', borderRadius: R.input,
    paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: C.text,
  },
  track: { height: 8, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: 8 },
});
