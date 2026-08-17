import { useFonts } from 'expo-font';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Linking, SafeAreaView, StatusBar, Text, TextInput, View } from 'react-native';
import { setAuthFailHandler, Trip } from './src/api';
import { getUserId, hasAuthKeys, loadSession, signOut } from './src/auth';
import { configurePurchases } from './src/purchases';
import ForgotPassword from './src/screens/ForgotPassword';
import Paywall from './src/screens/Paywall';
import ResetPassword from './src/screens/ResetPassword';
import { parseAuthLink } from './src/deepLink';
import { adoptRecoverySession } from './src/auth';
import { currentSubscription } from './src/subscription';
import { registerForPush } from './src/push';
import Debrief from './src/screens/Debrief';
import Documents from './src/screens/Documents';
import Home from './src/screens/Home';
import Kits from './src/screens/Kits';
import Login from './src/screens/Login';
import TopBar, { FloatingAdd, FloatingHome, FloatingProfile } from './src/components/TopBar';
import Guide from './src/screens/Guide';
import Packing from './src/screens/Packing';
import Profile from './src/screens/Profile';
import Journal from './src/screens/Journal';
import Planner from './src/screens/Planner';
import SOS from './src/screens/SOS';
import TripHub from './src/screens/TripHub';
import Wizard from './src/screens/Wizard';
import Archive from './src/screens/Archive';
import { accentForTrip, F, P, S, titleize } from './src/theme';

/**
 * Satoshi as the app-wide default.
 *
 * A React Native <Text> with no fontFamily silently falls back to the system
 * face, and an audit found 71 of them plus 14 TextInputs — styles that set
 * colour and size but omitted the font. Rather than rely on every style
 * remembering, the base components default to Satoshi and any explicit style
 * still overrides. Screens migrated onto the T scale get it either way; this
 * is the guarantee for the ones that have not moved yet.
 */
/** Measured from the artwork's alpha bounds (743 x 600) — a wrong ratio
 *  stretches the mark, and this one is shown large. */
const LOCKUP_ASPECT = 743 / 600;

function defaultToSatoshi() {
  for (const Comp of [Text, TextInput] as any[]) {
    Comp.defaultProps = Comp.defaultProps || {};
    Comp.defaultProps.style = [{ fontFamily: F.reg }, Comp.defaultProps.style];
  }
}
defaultToSatoshi();

type Route =
  | { name: 'home' }
  | { name: 'login' }
  | { name: 'wizard' }
  | { name: 'hub'; trip: Trip }
  | { name: 'packing'; trip: Trip }
  | { name: 'guide'; trip: Trip; section: string }
  | { name: 'journal'; trip: Trip }
  | { name: 'plan'; trip: Trip }
  | { name: 'sos'; trip: Trip }
  | { name: 'debrief'; trip: Trip }
  | { name: 'kits' }
  | { name: 'documents'; from?: 'profile' }  // remembers where to go back to
  | { name: 'profile' }
  | { name: 'archive'; trips: Trip[] }
  | { name: 'forgot'; email?: string }
  | { name: 'reset' };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [homeKey, setHomeKey] = useState(0);
  // In-trip screens wear the destination's colour. The FAB and bottom bar stay
  // brand blue in every trip — they are global chrome, not trip surface.
  const screenAccent = (t: Trip) => accentForTrip(t.country_code, t.title);
  const [booting, setBooting] = useState(true);
  const [fontsLoaded] = useFonts({
    Satoshi: require('./assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Medium': require('./assets/fonts/Satoshi-Medium.otf'),
    'Satoshi-Bold': require('./assets/fonts/Satoshi-Bold.otf'),
  });
  const [authed, setAuthed] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  // Shown when a recovery link is dead rather than valid — the same screen
  // handles both, because both arrive on the same URL.
  const [linkError, setLinkError] = useState<string | null>(null);

  const goHome = () => { setHomeKey(k => k + 1); setRoute({ name: 'home' }); };

  useEffect(() => {
    setAuthFailHandler(() => { setAuthed(false); setRoute({ name: 'login' }); });
    // Assigned inside the async body below, torn down by the effect's cleanup.
    let cleanupLink: (() => void) | undefined;
    (async () => {
      const s = await loadSession();
      setAuthed(s === 'authed');
      // A recovery link can arrive two ways: cold, opening the app (the
      // initial URL), or while it is already running (the event). Both are
      // ordinary — tapping the email with the app backgrounded is the common
      // case — so both are handled, and the same parser reads them.
      const handleLink = async (url: string | null) => {
        const link = parseAuthLink(url);
        if (!link) return;                       // not ours; ignore quietly
        if (link.kind === 'error') {
          setLinkError(link.message);
          setRoute({ name: 'forgot' });
          return;
        }
        const ok = await adoptRecoverySession(link.accessToken, link.refreshToken);
        if (ok) {
          setAuthed(true);
          setRoute({ name: 'reset' });
        } else {
          setLinkError('That reset link is no longer valid.');
          setRoute({ name: 'forgot' });
        }
      };
      Linking.getInitialURL().then(handleLink).catch(() => {});
      const sub = Linking.addEventListener('url', e => { handleLink(e.url); });
      cleanupLink = () => sub.remove();

      if (s === 'authed') {
        registerForPush();
        // Configured WITH the user id, never anonymously — see purchases.ts.
        // Deliberately not awaited: a slow or unreachable store must not hold
        // up the first render, and nothing on screen depends on it yet.
        configurePurchases(getUserId());
      }
      if (s === 'anon') setRoute({ name: 'login' });
      setBooting(false);
    })();
    return () => { cleanupLink?.(); };
  }, []);

  if (booting || !fontsLoaded) {
    // Deliberately the same picture as the native splash: the full lockup —
    // mark, VOYAGE OS, and "Voyage. Optimized." — at 70% of screen width on
    // P.pageBg, which is what app.json's splash backgroundColor is set to.
    // The old screen showed the horizontal wordmark with no tagline, so the
    // handoff from native splash to JS was a visible jump between two
    // different logos. Matching them makes the boundary disappear.
    const lockW = Dimensions.get('window').width * 0.70;
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: P.pageBg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          {/* @ts-ignore — image module typing lives in the Expo project */}
          <Image
            source={require('./assets/lockup.png')}
            style={{ width: lockW, height: lockW / LOCKUP_ASPECT }}
            resizeMode="contain"
            accessibilityRole="image"
            accessibilityLabel="VoyageOS — Voyage. Optimized."
          />
          <ActivityIndicator style={{ marginTop: S[8] }} color={P.brand} />
        </View>
      </SafeAreaView>
    );
  }

  // The identity bar belongs to Home only. Inner screens are hierarchical and
  // keep their own `‹ Trip name` back links; a fixed logo bar cannot express
  // "back one level", and stacking both would be two navigation systems.
  const showTopBar = route.name === 'home' || route.name === 'profile';
  // The + is reachable wherever a trip could be added from, but not over the
  // login screen or a wizard that is already creating one.
  const showAdd = route.name !== 'login' && route.name !== 'wizard';
  // Home is reachable from everywhere the + is, except Home itself — a button
  // that navigates to the screen you are on is just a dead target.
  const showHome = showAdd && route.name !== 'home';
  const showProfile = showAdd && route.name !== 'profile';

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: P.pageBg }}>
      <StatusBar barStyle="dark-content" />
      {showTopBar && (
        <TopBar
          onTierPress={() => {
            // Tier-dependent, deliberately. A free user is being invited to
            // buy, so the badge opens the paywall. A paying one already owns
            // it — selling them the same thing again is wrong; what they want
            // is renewal date, restore and cancel, which live in Profile.
            const tier = currentSubscription()?.tier ?? 'free';
            if (tier === 'free') setPlansOpen(true);
            else setRoute({ name: 'profile' });
          }}
        />
      )}
      <Paywall visible={plansOpen} onClose={() => setPlansOpen(false)} />
      <View style={{ flex: 1 }}>
      {route.name === 'forgot' && (
        <ForgotPassword
          email={route.email}
          notice={linkError}
          onBack={() => { setLinkError(null); setRoute({ name: 'login' }); }}
        />
      )}
      {route.name === 'reset' && (
        <ResetPassword
          onDone={() => { setAuthed(true); configurePurchases(getUserId()); goHome(); }}
          onStartOver={() => { setAuthed(false); setRoute({ name: 'forgot' }); }}
        />
      )}
      {route.name === 'login' && (
        <Login
          onForgot={(email) => setRoute({ name: 'forgot', email })}
          onDone={() => {
          setAuthed(true);
          // The mount effect above only runs once, so a sign-in during
          // this app session reaches here instead. Without it, someone
          // who signs in without relaunching has no RevenueCat identity
          // and their purchase would be filed against nobody.
          configurePurchases(getUserId());
          goHome();
        }} />
      )}
      {route.name === 'home' && (
        <Home
          key={homeKey}
          authed={authed}
          onSignOut={async () => { await signOut(); setAuthed(false); setRoute({ name: 'login' }); }}
          onKits={() => setRoute({ name: 'kits' })}
          onDocuments={() => setRoute({ name: 'documents' })}
          onNewTrip={() => setRoute({ name: 'wizard' })}
          onOpenTrip={(t: Trip) => setRoute({ name: 'hub', trip: t })}
          onArchive={(past) => setRoute({ name: 'archive', trips: past })}
        />
      )}
      {route.name === 'wizard' && (
        <Wizard
          onCancel={goHome}
          onDone={(trip) => setRoute({ name: 'hub', trip })}
        />
      )}
      {route.name === 'hub' && (
        <TripHub trip={route.trip} accent={screenAccent(route.trip)} onBack={goHome}
          onPack={() => setRoute({ name: 'packing', trip: route.trip })}
          onPlan={() => setRoute({ name: 'plan', trip: route.trip })}
          onGuide={(section) => setRoute({ name: 'guide', trip: route.trip, section })}
          onJournal={() => setRoute({ name: 'journal', trip: route.trip })}
          onSOS={() => setRoute({ name: 'sos', trip: route.trip })}
          onDebrief={() => setRoute({ name: 'debrief', trip: route.trip })}
          onTripChanged={(t) => (t ? setRoute({ name: 'hub', trip: t }) : goHome())} />
      )}
      {route.name === 'archive' && (
        <Archive trips={route.trips} onBack={goHome}
          onOpen={(t) => setRoute({ name: 'hub', trip: t })} />
      )}
      {route.name === 'packing' && (
        <Packing tripId={route.trip.id} tripTitle={titleize(route.trip.title)}
          accent={screenAccent(route.trip)}
          onBack={() => setRoute({ name: 'hub', trip: route.trip })}
          onDebrief={() => setRoute({ name: 'debrief', trip: route.trip })} />
      )}
      {route.name === 'guide' && (
        <Guide trip={route.trip} tripId={route.trip.id} tripTitle={titleize(route.trip.title)} section={route.section}
          onTripChanged={(t) => setRoute({ name: 'guide', trip: t, section: route.section })}
          accent={screenAccent(route.trip)}
          place={route.trip.place ?? route.trip.title.replace(/ trip$/i, '')}
          country={route.trip.country_code ?? null}
          onBack={() => setRoute({ name: 'hub', trip: route.trip })} />
      )}
      {route.name === 'journal' && (
        <Journal tripId={route.trip.id} tripTitle={titleize(route.trip.title)}
          accent={screenAccent(route.trip)}
          onBack={() => setRoute({ name: 'hub', trip: route.trip })} />
      )}
      {route.name === 'plan' && (
        <Planner tripId={route.trip.id} tripTitle={titleize(route.trip.title)}
          accent={screenAccent(route.trip)}
          startDate={route.trip.start_date} endDate={route.trip.end_date}
          onBack={() => setRoute({ name: 'hub', trip: route.trip })} />
      )}
      {route.name === 'sos' && (
        <SOS tripId={route.trip.id} tripTitle={titleize(route.trip.title)}
          place={route.trip.place ?? route.trip.title.replace(/ trip$/i, '')}
          accent={screenAccent(route.trip)}
          onBack={() => setRoute({ name: 'hub', trip: route.trip })} />
      )}
      {route.name === 'debrief' && (
        <Debrief tripId={route.trip.id} tripTitle={titleize(route.trip.title)} onDone={goHome} />
      )}
      {route.name === 'kits' && <Kits onBack={goHome} />}
      {route.name === 'documents' && (
        <Documents onBack={() => setRoute(route.from === 'profile' ? { name: 'profile' } : { name: 'home' })} />
      )}
      {route.name === 'profile' && (
        <Profile
          onSignedOut={() => { setAuthed(false); setRoute({ name: 'login' }); }}
          onDocuments={() => setRoute({ name: 'documents', from: 'profile' })}
        />
      )}
      </View>
      {showHome && <FloatingHome onPress={goHome} />}
      {showProfile && <FloatingProfile onPress={() => setRoute({ name: 'profile' })} />}
      {showAdd && <FloatingAdd onPress={() => setRoute({ name: 'wizard' })} />}
    </SafeAreaView>
  );
}

