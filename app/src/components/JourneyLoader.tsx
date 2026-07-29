import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { F, tint } from '../theme';

/** The journey as the wait — your exact icons, tinted to the trip's accent. */
/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-ignore image modules typed in the Expo project
const IMGS = [
  require('../../assets/journey/tee.png'), require('../../assets/journey/bag.png'),
  require('../../assets/journey/car.png'), require('../../assets/journey/train.png'),
  require('../../assets/journey/ship.png'), require('../../assets/journey/plane.png'),
  require('../../assets/journey/hotel.png'), require('../../assets/journey/dish.png'),
  require('../../assets/journey/play.png'),
];
const STAGES = IMGS.length;
const W = 240;

export default function JourneyLoader({ accent, label }: { accent: string; label: string }) {
  const t = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    const loop = Animated.loop(Animated.timing(t, {
      toValue: STAGES, duration: STAGES * 1300, easing: Easing.linear, useNativeDriver: true,
    }));
    loop.start();
    return () => loop.stop();
  }, [t]);
  return (
    <View style={s.wrap}>
      <View style={{ width: W, height: 96 }}>
        {IMGS.map((src, i) => {
          const opacity = t.interpolate({
            inputRange: [i - 0.35, i, i + 0.65, i + 1],
            outputRange: [0, 1, 1, 0], extrapolate: 'clamp',
          });
          const tx = t.interpolate({
            inputRange: [i - 0.35, i, i + 1],
            outputRange: [40, 0, -16], extrapolate: 'clamp',
          });
          return (
            <Animated.Image key={i} source={src} resizeMode="contain"
              style={[s.stage, { opacity, transform: [{ translateX: tx }], tintColor: tint(accent, 0.85) }]} />
          );
        })}
      </View>
      <View style={s.track}>
        {Array.from({ length: 11 }).map((_, i) => (
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
  stage: { position: 'absolute', left: (W - 88) / 2, top: 4, width: 88, height: 88 },
  track: { width: W, flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  runner: { position: 'absolute', left: 0, top: -1.5, width: 9, height: 9, borderRadius: 5 },
  label: { fontFamily: F.bold, fontSize: 14, marginTop: 14, letterSpacing: 0.3 },
});
