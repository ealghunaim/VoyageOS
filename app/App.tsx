import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StatusBar, Text, View } from 'react-native';
import { setAuthFailHandler, Trip } from './src/api';
import { hasAuthKeys, loadSession, signOut } from './src/auth';
import Debrief from './src/screens/Debrief';
import Documents from './src/screens/Documents';
import Home from './src/screens/Home';
import Kits from './src/screens/Kits';
import Login from './src/screens/Login';
import Packing from './src/screens/Packing';
import Wizard from './src/screens/Wizard';
import { C } from './src/theme';

type Route =
  | { name: 'home' }
  | { name: 'login' }
  | { name: 'wizard' }
  | { name: 'packing'; tripId: string; tripTitle: string }
  | { name: 'debrief'; tripId: string; tripTitle: string }
  | { name: 'kits' }
  | { name: 'documents' };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [homeKey, setHomeKey] = useState(0);
  const [booting, setBooting] = useState(true);
  const [authed, setAuthed] = useState(false);

  const goHome = () => { setHomeKey(k => k + 1); setRoute({ name: 'home' }); };

  useEffect(() => {
    setAuthFailHandler(() => { setAuthed(false); setRoute({ name: 'login' }); });
    (async () => {
      const s = await loadSession();
      setAuthed(s === 'authed');
      if (s === 'anon') setRoute({ name: 'login' });
      setBooting(false);
    })();
  }, []);

  if (booting) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 30, fontWeight: '900', color: C.blue }}>VoyageOS</Text>
          <ActivityIndicator style={{ marginTop: 16 }} color={C.blue} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
      {route.name === 'login' && (
        <Login onDone={() => { setAuthed(true); goHome(); }} />
      )}
      {route.name === 'home' && (
        <Home
          key={homeKey}
          authed={authed}
          onSignOut={async () => { await signOut(); setAuthed(false); setRoute({ name: 'login' }); }}
          onKits={() => setRoute({ name: 'kits' })}
          onDocuments={() => setRoute({ name: 'documents' })}
          onNewTrip={() => setRoute({ name: 'wizard' })}
          onOpenTrip={(t: Trip) =>
            setRoute({ name: 'packing', tripId: t.id, tripTitle: t.title })}
        />
      )}
      {route.name === 'wizard' && (
        <Wizard
          onCancel={goHome}
          onDone={(tripId) =>
            setRoute({ name: 'packing', tripId, tripTitle: 'Your new trip' })}
        />
      )}
      {route.name === 'packing' && (
        <Packing tripId={route.tripId} tripTitle={route.tripTitle} onBack={goHome}
          onDebrief={() => setRoute({ name: 'debrief', tripId: route.tripId, tripTitle: route.tripTitle })} />
      )}
      {route.name === 'debrief' && (
        <Debrief tripId={route.tripId} tripTitle={route.tripTitle} onDone={goHome} />
      )}
      {route.name === 'kits' && <Kits onBack={goHome} />}
      {route.name === 'documents' && <Documents onBack={goHome} />}
    </SafeAreaView>
  );
}
