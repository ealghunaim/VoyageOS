// The paywall. What a real user sees when they need to upgrade.
//
// A modal rather than a pushed screen because it is triggered: someone was
// building a trip, hit their limit, and wants to get back to what they were
// doing. A push would bury the wizard behind a navigation stack; a modal keeps
// it underneath, waiting.
//
// PRICES COME FROM STOREKIT, NOT FROM US
//
// Every price shown is product.priceString — Apple's own number, in the user's
// own currency. The server's TIER_PRICES is a fallback for the case where
// offerings will not load, and nothing else. That is not fussiness: those two
// had already drifted by $2 a tier, and the drift was only caught because a
// device printed the real number next to ours. A price quoted at the moment
// someone decides to pay has to be the price they are charged.
//
// WHAT IT DOES NOT CLAIM
//
// No feature matrix. Feature gating is 3b and does not exist yet, so a table
// of ticks and crosses would be describing a product we have not built. The
// tiers differ by trip count, which is what is actually true today.
import React, { useEffect, useState } from 'react';
// SafeAreaView from react-native, NOT from react-native-safe-area-context.
//
// A Modal renders in its own native view hierarchy. React context still
// reaches into it, so the context version renders and typechecks happily —
// it just reports insets measured from a provider that lives OUTSIDE the
// modal, which is to say zero at the top. It fails silently and looks right
// in code review. JourneyEditor used the react-native one all along and was
// the only one of the four modals that never had this bug.
import {
  ActivityIndicator, Linking, Modal, Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View,
} from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { PRIVACY_URL, TERMS_URL } from '../legal';
import {
  BUY_COPY, buyState, isBuyable, POLL_COPY, pollDecision, Tier, TIER_RANK, tierForProduct,
} from '../paywallLogic';
import { getOfferings, purchase, restore } from '../purchases';
import { currentSubscription, refreshSubscription, useSubscription } from '../subscription';
import { E, F, P, S, T } from '../theme';

/** How long to wait for our own webhook before saying "activating shortly".
 *  Long enough for the usual case, short enough not to trap someone behind a
 *  spinner — and harmless either way, because the timeout is not a failure. */
const POLL_TIMEOUT_MS = 15000;
const POLL_EVERY_MS = 1500;

const TRIPS: Record<Tier, number> = { explorer: 3, traveler: 6, voyager: 12 };
const BLURB: Record<Tier, string> = {
  explorer: 'For a couple of trips a year.',
  traveler: 'For regular travel.',
  voyager: 'For a year of constant motion.',
};

type Row = { tier: Tier; pkg: PurchasesPackage; price: string };
type Phase = 'browsing' | 'purchasing' | 'activating' | 'settled';

export default function Paywall({ visible, initialTier, onClose }: {
  visible: boolean;
  initialTier?: string | null;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [phase, setPhase] = useState<Phase>('browsing');
  const [note, setNote] = useState<string | null>(null);
  const [busyTier, setBusyTier] = useState<Tier | null>(null);
  const sub = useSubscription();
  const currentTier = sub?.tier ?? 'free';

  useEffect(() => {
    if (!visible) return;
    setPhase('browsing'); setNote(null); setBusyTier(null);
    (async () => {
      const offering = await getOfferings();
      if (!offering) { setLoadError(true); setRows([]); return; }
      const mapped: Row[] = [];
      for (const pkg of offering.availablePackages) {
        const tier = tierForProduct(pkg.product?.identifier);
        if (!tier) {
          // Skipped, never guessed. A package we cannot identify would
          // otherwise be sold as whichever tier happened to be nearest.
          console.log(`[paywall] unmappable package skipped: ` +
            `${pkg.identifier} → ${pkg.product?.identifier}`);
          continue;
        }
        mapped.push({ tier, pkg, price: pkg.product.priceString });
      }
      mapped.sort((a, b) => TIER_RANK[a.tier] - TIER_RANK[b.tier]);
      setLoadError(false);
      setRows(mapped);
    })();
  }, [visible]);

  /** Buy, then wait for OUR server to agree — see paywallLogic.pollDecision. */
  async function buy(row: Row) {
    const before = currentSubscription()?.tier ?? 'free';
    setBusyTier(row.tier); setPhase('purchasing'); setNote(null);

    const result = await purchase(row.pkg);
    if (result.status === 'cancelled') {
      setPhase('browsing'); setBusyTier(null);
      return;                                    // backing out is not an error
    }
    if (result.status === 'error') {
      setPhase('browsing'); setBusyTier(null);
      setNote(result.message);
      return;
    }

    setPhase('activating');
    const started = Date.now();
    for (;;) {
      await refreshSubscription();
      const decision = pollDecision({
        serverTier: currentSubscription()?.tier ?? null,
        tierBefore: before,
        elapsedMs: Date.now() - started,
        timeoutMs: POLL_TIMEOUT_MS,
      });
      if (decision.done) {
        setPhase('settled');
        setNote(POLL_COPY[decision.outcome]);
        // Either outcome is a success. 'pending' means the payment landed and
        // our webhook has not arrived yet — never phrased as a failure,
        // because it is not one and the money is already gone.
        setTimeout(onClose, decision.outcome === 'active' ? 900 : 2200);
        return;
      }
      await new Promise(r => setTimeout(r, POLL_EVERY_MS));
    }
  }

  const open = (url: string) => Linking.openURL(url).catch(() => {});

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={s.screen}>
        {/* The horizontal padding CANNOT live on the SafeAreaView above:
            react-native's implementation writes its own padding from the
            insets and clobbers whatever the style set, so paddingHorizontal
            there vanished and the cards and the ✕ ran to the screen edge. */}
        <View style={s.pad}>
        <View style={s.head}>
          <Text style={s.title}>Choose your plan</Text>
          <Pressable onPress={onClose} hitSlop={12} accessibilityLabel="Close">
            <Text style={s.close}>✕</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ paddingBottom: S[8] }}>
          <Text style={s.sub}>
            Every plan includes everything in VoyageOS. Plans differ by how many
            trips you can keep at once.
          </Text>

          {rows === null && <ActivityIndicator style={{ marginTop: S[6] }} />}

          {rows?.length === 0 && (
            <View style={s.card}>
              <Text style={s.cardTitle}>Plans are unavailable right now</Text>
              <Text style={s.blurb}>
                {loadError
                  ? 'We could not reach the App Store. Check your connection and try again.'
                  : 'No plans are currently offered.'}
              </Text>
            </View>
          )}

          {rows?.map(row => {
            const state = buyState(currentTier, row.tier);
            const owned = state === 'current';
            // Never recommend what they already have — the 402 names an
            // upgrade target, but a stale badge or a race could still point
            // at the current plan.
            const recommended = row.tier === initialTier && !owned;
            return (
              <View key={row.tier}
                style={[s.card, recommended && s.cardRecommended, recommended && E.mid]}>
                {recommended && <Text style={s.badge}>RECOMMENDED</Text>}
                <View style={s.cardTop}>
                  <Text style={s.cardTitle}>
                    {row.tier[0].toUpperCase() + row.tier.slice(1)}
                  </Text>
                  {/* Apple's number, in Apple's currency. */}
                  <Text style={s.price}>{row.price}</Text>
                </View>
                <Text style={s.blurb}>{BLURB[row.tier]}</Text>
                <Text style={s.trips}>{TRIPS[row.tier]} trips</Text>
                <Pressable
                  onPress={() => buy(row)}
                  disabled={!isBuyable(state) || phase !== 'browsing'}
                  accessibilityState={{ disabled: owned }}
                  style={({ pressed }) => [
                    s.buy,
                    recommended && s.buyPrimary,
                    owned && s.buyOwned,
                    !owned && (phase !== 'browsing' || pressed) && { opacity: 0.7 },
                  ]}>
                  {busyTier === row.tier && phase !== 'browsing'
                    ? <ActivityIndicator color={recommended ? P.card : P.brand} />
                    : (
                      <Text style={[
                        s.buyText,
                        recommended && { color: P.card },
                        owned && s.buyOwnedText,
                      ]}>
                        {/* The plan you are on is stated, not sold. Offering
                            "Subscribe" here sends you to Apple for the reply
                            "You're currently subscribed to this." */}
                        {owned ? BUY_COPY.current
                               : `${BUY_COPY[state]} — ${row.price}/month`}
                      </Text>
                    )}
                </Pressable>
              </View>
            );
          })}

          {phase === 'activating' && (
            <Text style={s.status}>Activating your plan…</Text>
          )}
          {!!note && <Text style={s.status}>{note}</Text>}

          <Pressable onPress={async () => {
            setNote(null);
            const ok = await restore();
            await refreshSubscription();
            setNote(ok ? 'Purchases restored.' : 'Nothing to restore on this account.');
          }} style={s.restore}>
            <Text style={s.restoreText}>Restore purchases</Text>
          </Pressable>

          {/* Apple requires the term, the renewal behaviour and both links to
              be visible on the screen where the purchase happens. */}
          <Text style={s.legal}>
            Plans are billed monthly and renew automatically until cancelled.
            Cancel any time in your Apple account settings; cancelling takes
            effect at the end of the current period.
          </Text>
          <View style={s.legalLinks}>
            <Pressable onPress={() => open(TERMS_URL)}>
              <Text style={s.legalLink}>Terms of Use</Text>
            </Pressable>
            <Text style={s.legalDot}>·</Text>
            <Pressable onPress={() => open(PRIVACY_URL)}>
              <Text style={s.legalLink}>Privacy Policy</Text>
            </Pressable>
          </View>
        </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const s = StyleSheet.create({
// A full-screen Modal renders outside the app's SafeArea wrapper, so it has to
// claim the top inset itself. This used to be `paddingTop: S[8]` — 32pt, a
// guess that cleared the status bar on the phones it was written on and put
// the title under the notch on a Pro Max, where the inset is nearer 62.
  // Insets only — see the note at the SafeAreaView. Anything set here that
  // SafeAreaView also writes is discarded without warning.
  screen: { flex: 1, backgroundColor: P.pageBg },
  pad: { flex: 1, paddingHorizontal: S[5], paddingTop: S[4] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: S[2] },
  title: { ...T.h1, color: P.textPri },
  close: { ...T.h2, color: P.textMuted },
  sub: { ...T.body, color: P.textSec, marginBottom: S[5] },
  card: { backgroundColor: P.card, borderRadius: 18, padding: S[4], marginBottom: S[3] },
  cardRecommended: { borderWidth: 2, borderColor: P.brand },
  badge: { ...T.label, color: P.brand, marginBottom: S[1] },
  cardTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  cardTitle: { ...T.h2, color: P.textPri },
  price: { ...T.title, color: P.textPri },
  blurb: { ...T.caption, color: P.textSec, marginTop: 2 },
  trips: { ...T.body, color: P.textPri, fontFamily: F.med, marginTop: S[2] },
  buy: { marginTop: S[3], paddingVertical: 12, borderRadius: 12, alignItems: 'center',
         borderWidth: 1, borderColor: P.brand },
  buyPrimary: { backgroundColor: P.brand, borderColor: P.brand },
  buyText: { ...T.title, color: P.brand },
  buyOwned: { backgroundColor: 'transparent', borderColor: P.hairline },
  buyOwnedText: { color: P.textMuted },
  status: { ...T.body, color: P.textSec, textAlign: 'center', marginTop: S[3] },
  restore: { alignItems: 'center', paddingVertical: S[4] },
  restoreText: { ...T.body, color: P.brand, fontFamily: F.med },
  legal: { ...T.caption, color: P.textMuted, marginTop: S[2] },
  legalLinks: { flexDirection: 'row', justifyContent: 'center', marginTop: S[3] },
  legalLink: { ...T.caption, color: P.textSec, textDecorationLine: 'underline' },
  legalDot: { ...T.caption, color: P.textMuted, marginHorizontal: S[2] },
});
