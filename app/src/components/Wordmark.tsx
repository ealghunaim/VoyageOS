import React, { useEffect, useRef } from 'react';
import { Animated, Image, Pressable } from 'react-native';

/**
 * VOYAGE OS — the real horizontal lockup. Taps go Home.
 *
 * This used to composite the mark with the words typed out in Satoshi, which
 * was the right call when there was no wordmark to use. There is one now, and
 * setting the brand's own lettering beside a re-typed copy of it read as two
 * slightly different logos on the same screen.
 *
 * `size` stays the cap-height reference the old component exposed, so every
 * call site keeps its existing proportions. ASPECT comes from the artwork's
 * measured alpha bounds, not a guess — a wrong number here stretches the mark.
 */
const ASPECT = 4.0025;   // 4795 x 1199, trimmed to its alpha bounds

export default function Wordmark({ size = 28, onPress }: { size?: number; onPress?: () => void }) {
  const fade = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(fade, { toValue: 1, duration: 700, useNativeDriver: true }).start();
  }, [fade]);

  const h = size * 1.5;   // matches the height the mark occupied before
  return (
    <Pressable onPress={onPress}>
      <Animated.View style={{ opacity: fade }}>
        {/* @ts-ignore — image module typing lives in the Expo project */}
        <Image
          source={require('../../assets/wordmark.png')}
          style={{ width: h * ASPECT, height: h }}
          resizeMode="contain"
          accessibilityRole="image"
          accessibilityLabel="VoyageOS"
        />
      </Animated.View>
    </Pressable>
  );
}
