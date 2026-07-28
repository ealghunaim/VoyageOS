import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';
import { C } from '../theme';

/** VOYAGE OS — the aurora ribbon V. Taps go Home. */
export default function Wordmark({ size = 28, onPress }: { size?: number; onPress?: () => void }) {
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.spring(glow, { toValue: 0.85, friction: 5, useNativeDriver: true }),
      Animated.spring(glow, { toValue: 1, friction: 6, useNativeDriver: true }),
    ]).start();
  }, [glow]);
  const s = size * 1.35;
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.View style={{ opacity: glow, marginRight: 7 }}>
        <Svg width={s} height={s} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="ribbon" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#1D6BFF" />
              <Stop offset="1" stopColor="#3FD1FF" />
            </LinearGradient>
            <LinearGradient id="sheen" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0" stopColor="#B9F1FF" stopOpacity="0.95" />
              <Stop offset="1" stopColor="#7EE8FF" stopOpacity="0.6" />
            </LinearGradient>
          </Defs>
          <Path d="M14 18 L50 84 L86 18" stroke="#3FD1FF" strokeWidth={30} opacity={0.16}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M14 18 L50 84 L86 18" stroke="url(#ribbon)" strokeWidth={19}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <Path d="M16 14 L50 76 L84 14" stroke="url(#sheen)" strokeWidth={6}
            fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
      </Animated.View>
      <Text style={{ fontSize: size, fontWeight: '800', color: C.text, letterSpacing: 2.5 }}>VOYAGE</Text>
      <Text style={{ fontSize: size, fontWeight: '800', color: C.blue, letterSpacing: 2.5 }}>OS</Text>
    </Pressable>
  );
}
