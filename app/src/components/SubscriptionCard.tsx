// Your plan: what you are on, when it renews, and the two things Apple
// requires you be able to do from inside the app.
//
// RESTORE AND MANAGE ARE NOT OPTIONAL
//
// App Review rejects subscription apps that cannot restore a purchase, and
// expects a route to cancellation. Both are also just correct: someone who
// reinstalls on a new phone has paid and would otherwise be stuck, and hiding
// the cancel path is a dark pattern that costs more in refunds and reviews
// than it ever earns in retained subscriptions.
//
// Manage opens Apple's own subscription screen. We cannot cancel on someone's
// behalf — only Apple can — so the honest thing is to take them there in one
// tap rather than describe where to look.
import React, { useState } from 'react';
import { ActivityIndicator, Linking, Pressable, Text, View } from 'react-native';

import { restore } from '../purchases';
import { refreshSubscription, useSubscription } from '../subscription';
import { Card } from './ui';
import { F, P, S, T } from '../theme';

/** Apple's subscription management screen. The itms-apps: scheme opens the
 *  App Store app directly; the https form would bounce through Safari. */
const MANAGE_URL = 'itms-apps://apps.apple.com/account/subscriptions';

function renewalLine(sub: { status: string; renews_at: string | null }): string | null {
  if (!sub.renews_at) return null;
  const when = new Date(sub.renews_at);
  if (isNaN(when.getTime())) return null;
  const date = when.toLocaleDateString(undefined,
    { year: 'numeric', month: 'long', day: 'numeric' });
  // Wording follows status, because "renews" is wrong for a cancelled plan
  // that is simply running out, and telling someone it will renew when it
  // will not is the kind of small lie that becomes a support ticket.
  if (sub.status === 'cancelled') return `Access until ${date}`;
  if (sub.status === 'lapsed') return `Ended ${date}`;
  if (sub.status === 'grace') return `Payment retrying — access until ${date}`;
  return `Renews ${date}`;
}

export default function SubscriptionCard({ onUpgrade }: { onUpgrade: () => void }) {
  const sub = useSubscription();
  const [busy, setBusy] = useState<'restore' | null>(null);
  const [note, setNote] = useState<string | null>(null);

  if (!sub) return null;

  const paid = sub.tier !== 'free';
  const renewal = renewalLine(sub);

  return (
    <Card>
      <Text style={{ ...T.label, color: P.textMuted, marginBottom: S[2] }}>YOUR PLAN</Text>

      <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <Text style={{ ...T.h2, color: P.textPri }}>{sub.tier_label}</Text>
        <Text style={{ ...T.caption, color: P.textSec }}>
          {sub.trips_used}/{sub.limit} trips
        </Text>
      </View>

      {!!renewal && (
        <Text style={{ ...T.caption, color: P.textSec, marginTop: 2 }}>{renewal}</Text>
      )}

      {!paid && (
        <Text style={{ ...T.caption, color: P.textSec, marginTop: 2 }}>
          {sub.next_tier
            ? `${sub.next_tier.label} adds ${sub.next_tier.limit} trips.`
            : 'Upgrade for more trips.'}
        </Text>
      )}

      <Pressable onPress={onUpgrade} style={{ marginTop: S[3] }}>
        <Text style={{ ...T.body, color: P.brand, fontFamily: F.med }}>
          {paid ? 'Change plan ›' : 'See plans ›'}
        </Text>
      </Pressable>

      <View style={{ flexDirection: 'row', marginTop: S[3], alignItems: 'center' }}>
        <Pressable
          disabled={busy !== null}
          onPress={async () => {
            setBusy('restore'); setNote(null);
            const ok = await restore();
            await refreshSubscription();
            setBusy(null);
            // Never phrased as a failure: "nothing to restore" is the normal
            // answer for someone who has not bought anything on this account.
            setNote(ok ? 'Purchases restored.' : 'Nothing to restore on this account.');
          }}
          style={{ marginRight: S[5] }}>
          <Text style={{ ...T.caption, color: P.textSec, textDecorationLine: 'underline' }}>
            Restore purchases
          </Text>
        </Pressable>

        {paid && (
          <Pressable onPress={() => Linking.openURL(MANAGE_URL).catch(() => {})}>
            <Text style={{ ...T.caption, color: P.textSec, textDecorationLine: 'underline' }}>
              Manage subscription
            </Text>
          </Pressable>
        )}

        {busy === 'restore' && <ActivityIndicator style={{ marginLeft: S[3] }} />}
      </View>

      {!!note && (
        <Text style={{ ...T.caption, color: P.textMuted, marginTop: S[2] }}>{note}</Text>
      )}
    </Card>
  );
}
