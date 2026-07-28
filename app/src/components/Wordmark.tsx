import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text } from 'react-native';
import Svg, { Circle, Polygon } from 'react-native-svg';
import { C } from '../theme';

/** Voyage·os — a bold paper plane on a dotted trail; taps go Home. */
export default function Wordmark({ size = 30, onPress }: { size?: number; onPress?: () => void }) {
  const fly = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.sequence([
      Animated.timing(fly, { toValue: 1, duration: 700, useNativeDriver: true }),
      Animated.spring(fly, { toValue: 0.92, friction: 4, useNativeDriver: true }),
      Animated.spring(fly, { toValue: 1, friction: 5, useNativeDriver: true }),
    ]).start();
  }, [fly]);
  const tx = fly.interpolate({ inputRange: [0, 1], outputRange: [-14, 0] });
  const ty = fly.interpolate({ inputRange: [0, 1], outputRange: [12, 0] });
  const s = size * 1.25;
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'flex-end' }}>
      <Animated.View style={{ transform: [{ translateX: tx }, { translateY: ty }], marginRight: 5, marginBottom: 2 }}>
        <Svg width={s} height={s} viewBox="0 0 100 100">
          {/* dotted trail */}
          <Circle cx="7" cy="88" r="3" fill="#F59E0B" opacity={0.5} />
          <Circle cx="19" cy="77" r="3.6" fill="#F59E0B" opacity={0.75} />
          <Circle cx="31" cy="66" r="4.2" fill="#F59E0B" />
          {/* paper plane: bold two-tone with carved keel */}
          <Polygon points="94,8 12,46 50,58" fill={C.blue} />
          <Polygon points="94,8 50,58 58,92" fill={C.text} />
          <Polygon points="50,58 58,92 46,72" fill={C.bg} />
        </Svg>
      </Animated.View>
      <Text style={{ fontSize: size, fontWeight: '900', color: C.text, letterSpacing: -1.4 }}>Voyage</Text>
      <Text style={{ fontSize: size * 0.5, fontWeight: '900', color: C.blue, marginBottom: 3, marginLeft: 2, letterSpacing: 0.5 }}>os</Text>
    </Pressable>
  );
}
