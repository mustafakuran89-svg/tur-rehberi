import { useEffect } from 'react';
import { parseRoute, useHashPath } from './lib/router';
import { TripsScreen } from './screens/TripsScreen';
import { SummaryScreen } from './screens/SummaryScreen';
import { DayScreen } from './screens/DayScreen';
import { StopScreen } from './screens/StopScreen';
import { FoodScreen } from './screens/FoodScreen';
import { PhrasesScreen } from './screens/PhrasesScreen';
import { PracticalScreen } from './screens/PracticalScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { TourScreen } from './screens/TourScreen';
import { ImportScreen } from './screens/ImportScreen';
import { PinScreen } from './screens/PinScreen';
import { TodayScreen } from './screens/TodayScreen';
import { TransferScreen } from './screens/TransferScreen';
import { PrepareScreen } from './screens/PrepareScreen';
import { ChecklistScreen } from './screens/ChecklistScreen';
import { VideosScreen } from './screens/VideosScreen';
import { WhatsNewScreen } from './screens/WhatsNewScreen';
import { RequestScreen } from './screens/RequestScreen';
import { TipsScreen } from './screens/TipsScreen';
import { EventsScreen } from './screens/EventsScreen';
import { Missing } from './components/ui';
import { tr } from './i18n/tr';
import { rememberTrip } from './lib/lastTrip';

export function App() {
  const path = useHashPath();
  const r = parseRoute(path);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path.split('?')[0]]);
  const tripKey = 'key' in r ? r.key : null;
  useEffect(() => {
    if (tripKey) rememberTrip(tripKey);
  }, [tripKey]);
  switch (r.name) {
    case 'trips':
      return <TripsScreen />;
    case 'import':
      return <ImportScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'summary':
      return <SummaryScreen tripKey={r.key} />;
    case 'phrases':
      return <PhrasesScreen tripKey={r.key} />;
    case 'practical':
      return <PracticalScreen tripKey={r.key} />;
    case 'day':
      return <DayScreen key={`${r.key}-${r.day}`} tripKey={r.key} dayIndex={r.day} />;
    case 'food':
      return <FoodScreen tripKey={r.key} dayIndex={r.day} />;
    case 'tour':
      return <TourScreen key={`${r.key}-${r.day}`} tripKey={r.key} dayIndex={r.day} />;
    case 'stop':
      return <StopScreen key={`${r.key}-${r.day}-${r.order}`} tripKey={r.key} dayIndex={r.day} order={r.order} />;
    case 'pin':
      return <PinScreen tripKey={r.key} dayIndex={r.day} kind={r.kind} refId={r.ref} />;
    case 'today':
      return <TodayScreen key={r.key} tripKey={r.key} />;
    case 'transfer':
      return <TransferScreen key={`${r.key}-${r.which}`} tripKey={r.key} which={r.which} />;
    case 'prepare':
      return <PrepareScreen tripKey={r.key} />;
    case 'checklist':
      return <ChecklistScreen tripKey={r.key} />;
    case 'videos':
      return <VideosScreen tripKey={r.key} dayIndex={r.day} />;
    case 'whatsnew':
      return <WhatsNewScreen />;
    case 'request':
      return <RequestScreen />;
    case 'tips':
      return <TipsScreen tripKey={r.key} />;
    case 'events':
      return <EventsScreen tripKey={r.key} />;
    default:
      return <Missing text={tr.notFound} />;
  }
}
