import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { SafeAreaProvider, SafeAreaView as SafeArea, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Dimensions, Image, Linking, SafeAreaView, StatusBar, Text, TextInput, View } from 'react-native';
import { setAuthFailHandler, Trip } from './src/api';
import { configurePurchases } from './src/purchases';
import ForgotPassword from './src/screens/ForgotPassword';
import Paywall from './src/screens/Paywall';
import ResetPassword from './src/screens/ResetPassword';
import { parseAuthLink } from './src/deepLink';
import { adoptRecoverySession, getUserId, loadSession } from './src/auth';
import { currentSubscription } from './src/subscription';
import { registerForPush } from './src/push';
import Debrief from './src/screens/Debrief';
import Documents from './src/screens/Documents';
import Home from './src/screens/Home';
import Kits from './src/screens/Kits';
import Login from './src/screens/Login';
import TopBar, { FloatingAdd, TabIcon } from './src/components/TopBar';
import Guide from './src/screens/Guide';
import Packing from './src/screens/Packing';
import Profile from './src/screens/Profile';
import Journal from './src/screens/Journal';
import Planner from './src/screens/Planner';
import SOS from './src/screens/SOS';
import TripHub from './src/screens/TripHub';
import Wizard from './src/screens/Wizard';
import { accentForTrip, F, P, S, T, titleize } from './src/theme';

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

/**
 * WHY A NAVIGATOR
 *
 * This was a `useState<Route>` switch with fifteen shapes, and three separate
 * things had grown to compensate for its lack of a stack:
 *
 *   - `{ name: 'documents'; from?: 'profile' }` — Documents is reachable from
 *     two places, and with no history the route had to carry its own return
 *     address.
 *   - `homeKey`, bumped to force Home to remount, because "go back to Home"
 *     could not mean "pop to what was already there".
 *   - Nothing listened for Android's hardware back, so it closed the app from
 *     every screen. 2f patched the wizard by hand; every other screen still
 *     had the bug, and fixing it screen-by-screen was eight more listeners.
 *
 * A stack answers all three at once, and none of them are navigator features —
 * they are just what having a history means.
 *
 * SHAPE
 *
 *   Root (stack)
 *     ├─ Login / Forgot / Reset      — when signed out, or mid password reset
 *     ├─ Tabs                        — Trips · Kits · Docs
 *     ├─ Wizard
 *     ├─ Profile
 *     └─ Hub · Packing · Guide · Journal · Plan · SOS · Debrief
 *
 * Trip screens push on the ROOT stack rather than inside the Trips tab, so the
 * tab bar is not present inside a trip. A trip wears its destination's colour
 * and every one of its screens already has a `‹ Trip name` back link; leaving
 * a tab bar underneath would put a second, contradictory way out on screen and
 * dilute the accent that makes a trip feel like its own place.
 */
const Root = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

/** Bar height above the home-indicator inset. 49 is the platform default and
 *  is more than a 21pt icon and an 11pt label need. */
const TAB_H = 46;

/** Params carried by the trip screens. Trip objects are passed whole, as they
 *  were before — every screen wants several fields off them. */
type TripParams = { trip: Trip };

/** Opening the paywall, without routing.
 *
 *  It is a modal over whatever is on screen, not a destination, so it is not a
 *  route. Passing the opener through navigation params would put a function
 *  into navigation state — which React Navigation warns about, because state
 *  is meant to be serialisable for persistence and deep links.
 */
const PlansContext = React.createContext<() => void>(() => {});

const screenAccent = (t: Trip) => accentForTrip(t.country_code, t.title);
const tripPlace = (t: Trip) => t.place ?? t.title.replace(/ trip$/i, '');

// ── the tab shell ───────────────────────────────────────────────────────────

/** Chrome shared by the three tab screens.
 *
 *  The identity bar is here rather than in each screen because on these three
 *  it means the same thing. It is deliberately NOT on trip screens: a fixed
 *  logo bar cannot express "back one level", and stacking it over a `‹` link
 *  would be two navigation systems again, which is the thing being removed.
 */
function TabShell({ children, onProfile }: {
  children: React.ReactNode; onProfile: () => void;
}) {
  const openPlans = React.useContext(PlansContext);
  return (
    <View style={{ flex: 1, backgroundColor: P.pageBg }}>
      <TopBar
        onProfile={onProfile}
        onTierPress={() => {
          // Tier-dependent, deliberately. A free user is being invited to
          // buy, so the badge opens the paywall. A paying one already owns
          // it — selling them the same thing again is wrong; what they want
          // is renewal date, restore and cancel, which live in Profile.
          const tier = currentSubscription()?.tier ?? 'free';
          if (tier === 'free') openPlans(); else onProfile();
        }}
      />
      <View style={{ flex: 1 }}>{children}</View>
    </View>
  );
}

function TabsScreen({ navigation }: any) {
  const onProfile = () => navigation.navigate('Profile');
  // The bar is sized here rather than left to the default, which reserves
  // 49pt for a 24pt icon over an 11pt label and reads heavy under a page
  // this airy. Height is stated explicitly so the home-indicator inset is
  // added to a known number instead of an assumed one.
  const insets = useSafeAreaInsets();
  return (
    <Tabs.Navigator
      screenOptions={({ route: r }) => ({
        headerShown: false,
        tabBarActiveTintColor: P.brand,
        tabBarInactiveTintColor: P.textMuted,
        tabBarStyle: {
          backgroundColor: P.card, borderTopColor: P.hairline,
          height: TAB_H + insets.bottom, paddingTop: 6, paddingBottom: insets.bottom,
        },
        tabBarItemStyle: { paddingVertical: 0 },
        tabBarIconStyle: { marginBottom: -2 },
        tabBarLabelStyle: { ...T.caption, fontFamily: F.med, fontSize: 11, marginTop: 1 },
        tabBarIcon: ({ color }) => (
          <TabIcon size={21} color={color}
            kind={r.name === 'Trips' ? 'trips' : r.name === 'Kits' ? 'kits' : 'docs'} />
        ),
      })}>
      <Tabs.Screen name="Trips">
        {() => (
          <TabShell onProfile={onProfile}>
            <Home
              onNewTrip={() => navigation.navigate('Wizard')}
              onOpenTrip={(t: Trip) => navigation.navigate('Hub', { trip: t })}
            />
            {/* The + stays a floating control on Trips only. It is the one
                primary action in the app, and a fourth tab for "create" would
                rank it alongside the places you go rather than above them. */}
            <FloatingAdd onPress={() => navigation.navigate('Wizard')} />
          </TabShell>
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Kits">
        {() => (
          <TabShell onProfile={onProfile}>
            <Kits />
          </TabShell>
        )}
      </Tabs.Screen>
      <Tabs.Screen name="Docs" options={{ title: 'Documents' }}>
        {() => (
          <TabShell onProfile={onProfile}>
            <Documents />
          </TabShell>
        )}
      </Tabs.Screen>
    </Tabs.Navigator>
  );
}

// ── the app ─────────────────────────────────────────────────────────────────

export default function App() {
  const [booting, setBooting] = useState(true);
  const [fontsLoaded] = useFonts({
    Satoshi: require('./assets/fonts/Satoshi-Regular.otf'),
    'Satoshi-Medium': require('./assets/fonts/Satoshi-Medium.otf'),
    'Satoshi-Bold': require('./assets/fonts/Satoshi-Bold.otf'),
  });
  const [authed, setAuthed] = useState(false);
  const [plansOpen, setPlansOpen] = useState(false);
  // Which auth screen the password-reset flow is on, if any. Rendering this as
  // a different set of stack screens — rather than navigating to them — is
  // what makes a dead session unable to leave a stale trip screen behind.
  const [authFlow, setAuthFlow] = useState<'forgot' | 'reset' | null>(null);
  // Shown when a recovery link is dead rather than valid — the same screen
  // handles both, because both arrive on the same URL.
  const [linkError, setLinkError] = useState<string | null>(null);
  const [resetEmail, setResetEmail] = useState<string | undefined>();
  // Above the boot early-return, deliberately: a hook called inside the JSX
  // below runs on the ready render and not the booting one, which is a
  // different hook count between renders and exactly the crash ESLint's
  // rules-of-hooks exists to catch.
  const openPlans = React.useCallback(() => setPlansOpen(true), []);

  useEffect(() => {
    setAuthFailHandler(() => { setAuthed(false); setAuthFlow(null); });
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
          setAuthFlow('forgot');
          return;
        }
        const ok = await adoptRecoverySession(link.accessToken, link.refreshToken);
        if (ok) {
          setAuthed(true);
          setAuthFlow('reset');
        } else {
          setLinkError('That reset link is no longer valid.');
          setAuthFlow('forgot');
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

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="dark-content" />
      {/* The top inset, once, for every screen.
          The old code got this from a SafeAreaView wrapping the whole app.
          Replacing it with SafeAreaProvider provides the inset VALUES but
          applies none of them, so the identity bar rendered under the clock
          and the notch. Only the top edge is claimed here — the bottom belongs
          to the tab bar, which insets itself, and claiming it twice would
          float the bar above the home indicator on a gap of dead pixels. */}
      <SafeArea style={{ flex: 1, backgroundColor: P.pageBg }} edges={['top']}>
      <NavigationContainer
        theme={{
          dark: false,
          colors: {
            primary: P.brand, background: P.pageBg, card: P.card,
            text: P.textPri, border: P.hairline, notification: P.brand,
          },
          fonts: {
            regular: { fontFamily: F.reg, fontWeight: '400' },
            medium: { fontFamily: F.med, fontWeight: '500' },
            bold: { fontFamily: F.bold, fontWeight: '700' },
            heavy: { fontFamily: F.bold, fontWeight: '700' },
          },
        }}>
        <Paywall visible={plansOpen} onClose={() => setPlansOpen(false)} />
        <PlansContext.Provider value={openPlans}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          {/* Auth screens and app screens are never both in the stack. Signing
              out therefore cannot leave a trip screen underneath a login form,
              which a navigate() would have. */}
          {!authed || authFlow ? (
            authFlow === 'reset' ? (
              <Root.Screen name="Reset">
                {() => (
                  <ResetPassword
                    onDone={() => {
                      setAuthed(true); setAuthFlow(null);
                      configurePurchases(getUserId());
                    }}
                    onStartOver={() => { setAuthed(false); setAuthFlow('forgot'); }}
                  />
                )}
              </Root.Screen>
            ) : authFlow === 'forgot' ? (
              <Root.Screen name="Forgot">
                {() => (
                  <ForgotPassword
                    email={resetEmail}
                    notice={linkError}
                    onBack={() => { setLinkError(null); setAuthFlow(null); }}
                  />
                )}
              </Root.Screen>
            ) : (
              <Root.Screen name="Login">
                {() => (
                  <Login
                    onForgot={(email) => { setResetEmail(email); setAuthFlow('forgot'); }}
                    onDone={() => {
                      setAuthed(true);
                      // The mount effect above only runs once, so a sign-in
                      // during this app session reaches here instead. Without
                      // it, someone who signs in without relaunching has no
                      // RevenueCat identity and their purchase would be filed
                      // against nobody.
                      configurePurchases(getUserId());
                    }}
                  />
                )}
              </Root.Screen>
            )
          ) : (
            <>
              <Root.Screen name="Tabs" component={TabsScreen} />

              <Root.Screen name="Wizard">
                {({ navigation }: any) => (
                  <Wizard
                    onCancel={() => navigation.goBack()}
                    onDone={(trip) => navigation.replace('Hub', { trip })}
                  />
                )}
              </Root.Screen>

              <Root.Screen name="Profile">
                {({ navigation }: any) => (
                  <Profile
                    onSignedOut={() => { setAuthed(false); setAuthFlow(null); }}
                    // No `from` param any more: the stack remembers where this
                    // was opened from, which is the whole reason it exists.
                    // Addressed through the parent, because Docs is a tab
                    // inside Tabs rather than a screen on this stack.
                    onDocuments={() => navigation.navigate('Tabs', { screen: 'Docs' })}
                    onBack={() => navigation.goBack()}
                  />
                )}
              </Root.Screen>

              <Root.Screen name="Hub">
                {({ navigation, route }: any) => {
                  const { trip } = route.params as TripParams;
                  return (
                    <TripHub trip={trip} accent={screenAccent(trip)}
                      onBack={() => navigation.goBack()}
                      onPack={() => navigation.navigate('Packing', { trip })}
                      onPlan={() => navigation.navigate('Plan', { trip })}
                      onGuide={(section: string) => navigation.navigate('Guide', { trip, section })}
                      onJournal={() => navigation.navigate('Journal', { trip })}
                      onSOS={() => navigation.navigate('SOS', { trip })}
                      onDebrief={() => navigation.navigate('Debrief', { trip })}
                      onTripChanged={(t: Trip | null) => (t
                        ? navigation.setParams({ trip: t })
                        : navigation.popToTop())} />
                  );
                }}
              </Root.Screen>

              <Root.Screen name="Packing">
                {({ navigation, route }: any) => {
                  const { trip } = route.params as TripParams;
                  return (
                    <Packing tripId={trip.id} tripTitle={titleize(trip.title)}
                      accent={screenAccent(trip)}
                      onBack={() => navigation.goBack()}
                      onDebrief={() => navigation.navigate('Debrief', { trip })} />
                  );
                }}
              </Root.Screen>

              <Root.Screen name="Guide">
                {({ navigation, route }: any) => {
                  const { trip, section } = route.params;
                  return (
                    <Guide trip={trip} tripId={trip.id} tripTitle={titleize(trip.title)}
                      section={section}
                      onTripChanged={(t: Trip) => navigation.setParams({ trip: t })}
                      accent={screenAccent(trip)}
                      place={tripPlace(trip)}
                      country={trip.country_code ?? null}
                      onBack={() => navigation.goBack()} />
                  );
                }}
              </Root.Screen>

              <Root.Screen name="Journal">
                {({ navigation, route }: any) => {
                  const { trip } = route.params as TripParams;
                  return (
                    <Journal tripId={trip.id} tripTitle={titleize(trip.title)}
                      accent={screenAccent(trip)}
                      startDate={trip.start_date} endDate={trip.end_date}
                      status={trip.status}
                      onBack={() => navigation.goBack()} />
                  );
                }}
              </Root.Screen>

              <Root.Screen name="Plan">
                {({ navigation, route }: any) => {
                  const { trip } = route.params as TripParams;
                  return (
                    <Planner tripId={trip.id} tripTitle={titleize(trip.title)}
                      accent={screenAccent(trip)}
                      startDate={trip.start_date} endDate={trip.end_date}
                      onBack={() => navigation.goBack()} />
                  );
                }}
              </Root.Screen>

              <Root.Screen name="SOS">
                {({ navigation, route }: any) => {
                  const { trip } = route.params as TripParams;
                  return (
                    <SOS tripId={trip.id} tripTitle={titleize(trip.title)}
                      place={tripPlace(trip)}
                      accent={screenAccent(trip)}
                      onBack={() => navigation.goBack()} />
                  );
                }}
              </Root.Screen>

              <Root.Screen name="Debrief">
                {({ navigation, route }: any) => {
                  const { trip } = route.params as TripParams;
                  return (
                    <Debrief tripId={trip.id} tripTitle={titleize(trip.title)}
                      onDone={() => navigation.popToTop()} />
                  );
                }}
              </Root.Screen>
            </>
          )}
        </Root.Navigator>
        </PlansContext.Provider>
      </NavigationContainer>
      </SafeArea>
    </SafeAreaProvider>
  );
}
