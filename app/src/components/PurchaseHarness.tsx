// A dev-only trigger for exercising a real sandbox purchase.
//
// THROWAWAY. This is not the paywall — phase 3 owns how subscriptions are
// presented, and nothing here should survive into it. It exists because 1b
// needs to prove that money moves and lands on the right account, and there
// is no UI yet from which to start a purchase.
//
// Kept in one file, rendered behind __DEV__, so removing it is deleting a
// file and one import rather than untangling it from a real screen.
//
// WHAT IT IS ACTUALLY TESTING
//
// Not "does the button work". The claim under test is that a purchase made on
// this device ends up attributed to THIS user on the server:
//
//   device buys → Apple → RevenueCat → webhook → subscriptions row → API
//
// which is why it re-reads GET /v1/subscription at the end rather than
// trusting the SDK's answer. The store telling the app "purchased" and the
// server knowing which tier to serve are different facts, and the second one
// is the only one that gates anything. They can also disagree briefly: the
// webhook may land after purchasePackage resolves, which is why the tier can
// still read "free" for a moment afterwards. That is expected, and worth
// seeing here rather than discovering in phase 3.
import React, { useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { getSubscription, Subscription } from '../api';
import { getUserId } from '../auth';
import { getOfferings, isReady, purchase, restore } from '../purchases';
import { Card } from './ui';
import { F, P, S, T } from '../theme';

export default function PurchaseHarness() {
  const [log, setLog] = useState<string[]>([]);
  const [packages, setPackages] = useState<PurchasesPackage[]>([]);
  const [sub, setSub] = useState<Subscription | null>(null);
  const [busy, setBusy] = useState(false);

  const say = (line: string) =>
    setLog(prev => [...prev.slice(-11), line]);

  const loadOfferings = async () => {
    setBusy(true);
    say(`sdk ready: ${isReady()}  user: ${getUserId().slice(0, 8) || '(none)'}…`);
    const offering = await getOfferings();
    if (!offering) {
      // The most likely causes, in the order they actually occur.
      say('no offering — check: Paid Applications Agreement active,');
      say('products attached to an Offering in RevenueCat, sandbox account');
      setPackages([]);
    } else {
      setPackages(offering.availablePackages);
      say(`offering "${offering.identifier}": ${offering.availablePackages.length} package(s)`);
      // The product identifier, not just the package label. A package is a
      // slot and its identifier is cosmetic — repurposed template slots can
      // read "$rc_annual" while holding a monthly product. What decides which
      // tier you actually buy is the attached product and the entitlement it
      // unlocks, so that is what gets printed.
      offering.availablePackages.forEach(p =>
        say(`  ${p.identifier} → ${p.product.identifier} (${p.product.priceString})`));
    }
    setBusy(false);
  };

  const buy = async (pkg: PurchasesPackage) => {
    setBusy(true);
    say(`buying ${pkg.identifier}…`);
    const result = await purchase(pkg);
    say(`store says: ${result.status}${result.status === 'error' ? ` — ${result.message}` : ''}`);
    if (result.status === 'purchased') {
      // Deliberately NOT treated as "the tier is now active". The server
      // learns from the webhook, which is a separate round trip through
      // RevenueCat and may not have landed yet.
      say('re-reading the server (the webhook may still be in flight)…');
      await refresh();
    }
    setBusy(false);
  };

  const refresh = async () => {
    try {
      const s = await getSubscription();
      setSub(s);
      say(`server: tier=${s.tier} status=${s.status} limit=${s.limit}`);
    } catch (e: any) {
      say(`server read failed: ${e?.message ?? String(e)}`);
    }
  };

  const doRestore = async () => {
    setBusy(true);
    say(`restore: ${(await restore()) ? 'ok' : 'unavailable'}`);
    await refresh();
    setBusy(false);
  };

  const btn = (label: string, onPress: () => void) => (
    <Pressable onPress={onPress} disabled={busy}
      style={{ paddingVertical: 8, paddingHorizontal: S[3], borderRadius: 8,
               borderWidth: 1, borderColor: P.hairline, marginRight: S[2],
               marginBottom: S[2], opacity: busy ? 0.4 : 1 }}>
      <Text style={{ ...T.caption, color: P.textPri, fontFamily: F.med }}>{label}</Text>
    </Pressable>
  );

  return (
    <Card>
      <Text style={{ ...T.label, color: P.danger, marginBottom: 2 }}>DEV ONLY · PURCHASE HARNESS</Text>
      <Text style={{ ...T.caption, color: P.textMuted, marginBottom: S[3] }}>
        Not the paywall. Deleted before phase 3.
      </Text>

      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {btn('Load offerings', loadOfferings)}
        {btn('Read server', refresh)}
        {btn('Restore', doRestore)}
      </View>

      {packages.map(p => (
        <Pressable key={p.identifier} onPress={() => buy(p)} disabled={busy}
          style={{ paddingVertical: 10, borderTopWidth: 1, borderTopColor: P.hairline,
                   opacity: busy ? 0.4 : 1 }}>
          <Text style={{ ...T.body, color: P.brand, fontFamily: F.med }}>
            Buy {p.product.identifier} — {p.product.priceString}
          </Text>
          <Text style={{ ...T.caption, color: P.textMuted }}>
            package {p.identifier} · {p.product.title}
          </Text>
        </Pressable>
      ))}

      {busy && <ActivityIndicator style={{ marginTop: S[2] }} />}

      {!!sub && (
        <View style={{ marginTop: S[3], paddingTop: S[3], borderTopWidth: 1, borderTopColor: P.hairline }}>
          <Text style={{ ...T.caption, color: P.textSec }}>
            server tier: {sub.tier} · status {sub.status} · {sub.trips_used}/{sub.limit} trips
          </Text>
        </View>
      )}

      {log.length > 0 && (
        <View style={{ marginTop: S[3], paddingTop: S[3], borderTopWidth: 1, borderTopColor: P.hairline }}>
          {log.map((l, i) => (
            <Text key={i} style={{ ...T.caption, color: P.textMuted, fontFamily: F.reg }}>{l}</Text>
          ))}
        </View>
      )}
    </Card>
  );
}
