import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { C } from '../theme';

export function Btn({ label, onPress, kind = 'primary', disabled = false }: {
  label: string; onPress: () => void; kind?: 'primary' | 'ghost'; disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={[s.btn, kind === 'ghost' && s.btnGhost, disabled && { opacity: 0.5 }]}
    >
      <Text style={[s.btnText, kind === 'ghost' && { color: C.blue }]}>{label}</Text>
    </Pressable>
  );
}

export function Card({ children }: { children: React.ReactNode }) {
  return <View style={s.card}>{children}</View>;
}

export function Chip({ label, selected, onPress }: {
  label: string; selected: boolean; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[s.chip, selected && s.chipOn]}>
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
        placeholderTextColor="#9aa7b8"
        autoCapitalize="none"
      />
    </View>
  );
}

export function Progress({ value }: { value: number }) {
  return (
    <View style={s.track}>
      <View style={[s.fill, { width: `${Math.round(value * 100)}%` }]} />
    </View>
  );
}

const s = StyleSheet.create({
  btn: { backgroundColor: C.blue, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  btnGhost: { backgroundColor: C.blueSoft },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  card: {
    backgroundColor: C.card, borderRadius: 16, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 12,
  },
  chip: {
    borderWidth: 1, borderColor: C.border, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 9, borderRadius: 20, margin: 4,
  },
  chipOn: { backgroundColor: C.blue, borderColor: C.blue },
  chipText: { color: C.text, fontWeight: '600' },
  fieldLabel: { color: C.sub, fontSize: 13, marginBottom: 6, fontWeight: '600' },
  input: {
    borderWidth: 1, borderColor: C.border, borderRadius: 12, backgroundColor: '#fff',
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: C.text,
  },
  track: { height: 8, borderRadius: 4, backgroundColor: C.border, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: C.blue },
});
