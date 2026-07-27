import React, { useEffect, useRef } from 'react';
import { Animated, Easing, Pressable, Text, View } from 'react-native';
import Svg, { Polygon } from 'react-native-svg';
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
          {/* the V, drawn as a needle: north arm accented, south arm navy */}
          <Polygon points="50,96 14,8 38,8 50,52" fill={C.blue} />
          <Polygon points="50,96 86,8 62,8 50,52" fill={C.text} />
        </Svg>
      </Animated.View>
      <Text style={{ fontSize: size, fontWeight: '900', color: C.text, letterSpacing: -0.5 }}>oyage</Text>
      <Text style={{ fontSize: size * 0.55, fontWeight: '800', color: C.blue, marginBottom: 2 }}>os</Text>
    </Pressable>
  );
}
