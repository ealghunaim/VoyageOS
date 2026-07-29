import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C, F, tint } from '../theme';

/** The journey as the wait: shirt → bag → car → plane → hotel, looping. */
const STAGES = 5;
const W = 220;

function Stage({ kind, accent }: { kind: number; accent: string }) {
  const A = (t = 0.85) => tint(accent, t);
  const art = [
    // 0 shirt folding
    <><Path d="M30 30 L42 20 h16 L70 30 l-6 12 -6 -4 V72 H42 V38 l-6 4 Z" fill={A()} />
      <Rect x={42} y={50} width={16} height={4} fill={A(0.4)} /></>,
    // 1 bag
    <><Path d="M32 44 q0 -18 18 -18 q18 0 18 18 v32 q0 7 -7 7 H39 q-7 0 -7 -7 Z" fill={A()} />
      <Rect x={40} y={56} width={20} height={15} rx={4} fill={A(0.4)} /></>,
    // 2 car
    <><Path d="M24 58 l6 -14 q2 -5 8 -5 h24 q6 0 8 5 l6 14 v12 h-7 v-5 H31 v5 h-7 Z" fill={A()} />
      <Circle cx={35} cy={68} r={5} fill={A(0.5)} /><Circle cx={65} cy={68} r={5} fill={A(0.5)} /></>,
    // 3 plane
    <><Path d="M20 56 L78 34 q6 -2 4 4 L72 52 l8 16 -7 3 -12 -12 -14 6 2 10 -6 2 -6 -12 -14 -4 Z" fill={A()} /></>,
    // 4 hotel
    <><Rect x={32} y={26} width={36} height={50} rx={4} fill={A()} />
      <Rect x={40} y={34} width={7} height={7} fill={A(0.35)} /><Rect x={53} y={34} width={7} height={7} fill={A(0.35)} />
      <Rect x={40} y={48} width={7} height={7} fill={A(0.35)} /><Rect x={53} y={48} width={7} height={7} fill={A(0.35)} />
      <Rect x={45} y={62} width={10} height={14} fill={A(0.4)} />
      <Path d="M26 26 h48 l-4 -8 H30 Z" fill={A(0.6)} /></>,
  ][kind];
  return <Svg width={64} height={64} viewBox="0 0 100 100">{art}</Svg>;
}

export default function JourneyLoader({ accent, label }: { accent: string; label: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, {
      toValue: STAGES, duration: STAGES * 1500, easing: Easing.linear, useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={s.wrap}>
      <View style={{ width: W, height: 84 }}>
        {Array.from({ length: STAGES }).map((_, i) => {
          const opacity = t.interpolate({
            inputRange: [i - 0.35, i, i + 0.65, i + 1],
            outputRange: [0, 1, 1, 0], extrapolate: 'clamp',
          });
          const tx = t.interpolate({
            inputRange: [i - 0.35, i, i + 1],
            outputRange: [36, 0, -14], extrapolate: 'clamp',
          });
          return (
            <Animated.View key={i} style={[s.stage, { opacity, transform: [{ translateX: tx }] }]}>
              <Stage kind={i} accent={accent} />
            </Animated.View>
          );
        })}
      </View>
      <View style={s.track}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={[s.dot, { backgroundColor: tint(accent, 0.3) }]} />
        ))}
        <Animated.View style={[s.runner, {
          backgroundColor: accent,
          transform: [{ translateX: t.interpolate({ inputRange: [0, STAGES], outputRange: [0, W - 10] }) }],
        }]} />
      </View>
      <Text style={[s.label, { color: accent }]}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: 26 },
  stage: { position: 'absolute', left: (W - 64) / 2, top: 8 },
  track: { width: W, flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  runner: { position: 'absolute', left: 0, top: -1.5, width: 9, height: 9, borderRadius: 5 },
  label: { fontFamily: F.bold, fontSize: 14, marginTop: 14, letterSpacing: 0.3 },
});
