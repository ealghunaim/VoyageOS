import React, { useState } from 'react';
import { SafeAreaView, StatusBar } from 'react-native';
import { Trip } from './src/api';
import Home from './src/screens/Home';
import Debrief from './src/screens/Debrief';
import Packing from './src/screens/Packing';
import Wizard from './src/screens/Wizard';
import { C } from './src/theme';

type Route =
  | { name: 'home' }
  | { name: 'wizard' }
  | { name: 'packing'; tripId: string; tripTitle: string }
  | { name: 'debrief'; tripId: string; tripTitle: string };

export default function App() {
  const [route, setRoute] = useState<Route>({ name: 'home' });
  const [homeKey, setHomeKey] = useState(0);

  const goHome = () => { setHomeKey(k => k + 1); setRoute({ name: 'home' }); };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="dark-content" />
      {route.name === 'home' && (
        <Home
          key={homeKey}
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
    </SafeAreaView>
  );
}
