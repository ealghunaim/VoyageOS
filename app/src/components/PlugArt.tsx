import React from 'react';
import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { C, tint } from '../theme';

/** Socket-face clip art per plug type letter — same minimal language as the landmarks. */
function Face({ letter, accent }: { letter: string; accent: string }) {
  const H = (children: React.ReactNode) => (
    <Svg width={56} height={56} viewBox="0 0 100 100">
      <Rect x={8} y={8} width={84} height={84} rx={20} fill={tint(accent, 0.07)}
        stroke={accent} strokeWidth={5} />
      {children}
    </Svg>
  );
  const F = accent;
  switch (letter) {
    case 'A': return H(<><Rect x={34} y={32} width={8} height={30} rx={3} fill={F} /><Rect x={58} y={32} width={8} height={30} rx={3} fill={F} /></>);
    case 'B': return H(<><Rect x={32} y={28} width={8} height={26} rx={3} fill={F} /><Rect x={60} y={28} width={8} height={26} rx={3} fill={F} /><Circle cx={50} cy={68} r={7} fill={F} /></>);
    case 'C': return H(<><Circle cx={32} cy={50} r={7} fill={F} /><Circle cx={68} cy={50} r={7} fill={F} /></>);
    case 'E': return H(<><Circle cx={32} cy={54} r={7} fill={F} /><Circle cx={68} cy={54} r={7} fill={F} /><Circle cx={50} cy={28} r={5} fill={F} /></>);
    case 'F': return H(<><Circle cx={32} cy={50} r={7} fill={F} /><Circle cx={68} cy={50} r={7} fill={F} /><Rect x={45} y={11} width={10} height={9} fill={F} /><Rect x={45} y={80} width={10} height={9} fill={F} /></>);
    case 'G': return H(<><Rect x={44} y={20} width={12} height={22} rx={3} fill={F} /><Rect x={22} y={58} width={20} height={12} rx={3} fill={F} /><Rect x={58} y={58} width={20} height={12} rx={3} fill={F} /></>);
    case 'I': return H(<><Path d="M26 30 l16 9 -5 9 -16 -9 Z" fill={F} /><Path d="M74 30 l-16 9 5 9 16 -9 Z" fill={F} /><Rect x={46} y={58} width={8} height={20} rx={3} fill={F} /></>);
    case 'D': return H(<><Circle cx={50} cy={28} r={8} fill={F} /><Circle cx={32} cy={62} r={7} fill={F} /><Circle cx={68} cy={62} r={7} fill={F} /></>);
    case 'M': return H(<><Circle cx={50} cy={26} r={9} fill={F} /><Circle cx={30} cy={64} r={8} fill={F} /><Circle cx={70} cy={64} r={8} fill={F} /></>);
    case 'H': return H(<><Path d="M28 28 l14 8 -4 8 -14 -8 Z" fill={F} /><Path d="M72 28 l-14 8 4 8 14 -8 Z" fill={F} /><Circle cx={50} cy={64} r={6} fill={F} /></>);
    case 'J': return H(<><Circle cx={32} cy={44} r={6} fill={F} /><Circle cx={68} cy={44} r={6} fill={F} /><Circle cx={50} cy={66} r={6} fill={F} /></>);
    case 'K': return H(<><Circle cx={32} cy={46} r={6} fill={F} /><Circle cx={68} cy={46} r={6} fill={F} /><Path d="M43 62 h14 v6 a7 7 0 0 1 -14 0 Z" fill={F} /></>);
    case 'L': return H(<><Circle cx={28} cy={50} r={6} fill={F} /><Circle cx={50} cy={50} r={6} fill={F} /><Circle cx={72} cy={50} r={6} fill={F} /></>);
    case 'N': return H(<><Circle cx={34} cy={60} r={6} fill={F} /><Circle cx={66} cy={60} r={6} fill={F} /><Circle cx={50} cy={34} r={6} fill={F} /></>);
    default: return H(<><Circle cx={32} cy={50} r={7} fill={F} /><Circle cx={68} cy={50} r={7} fill={F} /></>);
  }
}

export default function PlugArt({ plugs, accent }: { plugs: string; accent: string }) {
  const letters = Array.from(new Set(plugs.toUpperCase().match(/\b[A-N]\b/g) ?? [])).slice(0, 3);
  if (!letters.length) return null;
  return (
    <View style={{ flexDirection: 'row', marginTop: 10 }}>
      {letters.map(l => (
        <View key={l} style={{ alignItems: 'center', marginRight: 14 }}>
          <Face letter={l} accent={accent} />
          <Text style={{ color: C.sub, fontWeight: '800', fontSize: 12, marginTop: 3 }}>Type {l}</Text>
        </View>
      ))}
    </View>
  );
}
