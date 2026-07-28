import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { C } from '../theme';

/** Voyage·os — the V is a compass needle that settles on north at launch. */
export default function Wordmark({ size = 30, onPress }: { size?: number; onPress?: () => void }) {
  const spin = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.timing(spin, { toValue: 1, duration: 900, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
      Animated.spring(spin, { toValue: 0.90, friction: 3, useNativeDriver: true }),
      Animated.spring(spin, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [spin]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '0deg'] });
  const s = size * 1.1;

  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Animated.View style={{ transform: [{ rotate }], marginRight: -3, marginBottom: 1 }}>
        <Svg width={s} height={s} viewBox="0 0 100 100">
          {/* tapered needle-V: pivot dot, slim arms, sharp south tip */}
          <Polygon points="50,96 45,54 21,8 35,8 50,44" fill={C.blue} />
          <Polygon points="50,96 55,54 79,8 65,8 50,44" fill={C.text} />
          <Circle cx="50" cy="58" r="5.5" fill="#F59E0B" />
        </Svg>
      </Animated.View>
      <Text style={{ fontSize: size, fontWeight: '800', color: C.text, letterSpacing: -1.2 }}>oyage</Text>
      <Text style={{ fontSize: size * 0.5, fontWeight: '900', color: C.blue, marginBottom: 3, marginLeft: 2, letterSpacing: 0.5 }}>os</Text>
    </Pressable>
  );
}
