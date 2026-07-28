import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable, Text } from 'react-native';
import { C, F } from '../theme';

/** VOYAGE OS — the real luminous ribbon, alpha-composited. Taps go Home. */
export default function Wordmark({ size = 28, onPress }: { size?: number; onPress?: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fade]);
  const s = size * 1.5;
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Animated.View style={{ opacity: fade, marginRight: 8 }}>
        {/* @ts-ignore — image module typing lives in the Expo project */}
        <Image source={require('../../assets/mark.png')}
          style={{ width: s, height: s * 0.8 }} resizeMode="contain" />
      </Animated.View>
      <Text style={{ fontSize: size * 0.92, fontFamily: F.bold, color: C.text, letterSpacing: 1.2 }}>VOYAGE</Text>
      <Text style={{ fontSize: size * 0.92, fontFamily: F.bold, color: C.blue, letterSpacing: 1.2 }}> OS</Text>
    </Pressable>
  );
}
