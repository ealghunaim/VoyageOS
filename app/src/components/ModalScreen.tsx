// The root of a full-screen Modal. There is exactly one correct way to build
// one and this is it, because getting it wrong is invisible.
//
// TWO SILENT FAILURES LIVE HERE
//
// 1. SafeAreaView must come from `react-native`, NOT from
//    `react-native-safe-area-context`. A Modal renders in its own native view
//    hierarchy. React context still reaches into it, so the context version
//    mounts, typechecks and renders perfectly happily — it simply reports
//    insets measured from a provider that lives OUTSIDE the modal, which at
//    the top is zero. The title then sits under the notch. Nothing errors.
//
// 2. Padding must NOT be set on the SafeAreaView. react-native's
//    implementation writes its own paddingTop/Left/Right/Bottom from the
//    insets and discards whatever the passed style set, so a
//    paddingHorizontal there vanishes and the content runs to the screen
//    edge. Nothing errors here either.
//
// Both shipped, in consecutive commits, on the paywall — the one screen where
// a layout bug costs money. A convention would not have prevented either;
// both look correct at the call site. A component can.
//
// App.tsx is deliberately NOT built on this: it is not inside a Modal, sits
// directly under the SafeAreaProvider, and wants only the top edge so the tab
// bar can own the bottom.
import React from 'react';
import { SafeAreaView, StyleSheet, View } from 'react-native';

import { P, S } from '../theme';

export default function ModalScreen({ children, padded = true }: {
  children: React.ReactNode;
  /** Set false when the child is a ScrollView carrying its own
   *  contentContainerStyle padding — doubling it indents everything twice. */
  padded?: boolean;
}) {
  return (
    <SafeAreaView style={s.safe}>
      {padded ? <View style={s.pad}>{children}</View> : children}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  // Insets and background ONLY. Anything else set here that SafeAreaView also
  // writes is thrown away without a warning — see note 2 above.
  safe: { flex: 1, backgroundColor: P.pageBg },
  pad: { flex: 1, paddingHorizontal: S[5], paddingTop: S[4] },
});
