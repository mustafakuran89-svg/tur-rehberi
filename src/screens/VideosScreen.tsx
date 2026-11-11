import { tr } from '../i18n/tr';
import { stopsInOrder } from '../plan/normalize';
import type { Stop } from '../plan/types';
import { href, paths } from '../lib/router';
import type { UserState } from '../lib/userState';
import { VideoPlayer, useStopVideos, videoMeta } from '../components/VideoCard';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

function StopVideo({ tripKey, dayIndex, s, city, us }: { tripKey: string; dayIndex: number; s: Stop; city: string; us: UserState | undefined }) {
  // Bu sayfa arama yapmaz (kota); planla gelen, sabitlenen ve önbellekteki adaylar gösterilir.
  const { list } = useStopVideos(tripKey, s, city, us, { search: false });
  const v = list[0];
  return (
    <li className="card" data-testid="day-video">
      <h3>
        <span className="num">{s.order}</span> <a href={href(paths.stop(tripKey, dayIndex, s.order))}>{s.name}</a>
      </h3>
      {v ? (
        <>
          <VideoPlayer v={v} />
          <p className="video-title">{v.title}</p>
          <p className="small muted">{videoMeta(v)}</p>
        </>
      ) : (
        <p className="muted small">{tr.video.noneForStop}</p>
      )}
    </li>
  );
}

export function VideosScreen({ tripKey, dayIndex }: { tripKey: string; dayIndex: number }) {
  const { rec, us } = useTrip(tripKey);
  if (rec === undefined) return <Loading />;
  const day = rec?.trip.days[dayIndex];
  if (!rec || !day) return <Missing />;
  return (
    <div className="page">
      <Header title={tr.video.pageTitle} back={paths.day(tripKey, dayIndex)} kicker={<>{tr.day.label(dayIndex + 1)} · {day.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <p className="muted">{tr.video.pageIntro}</p>
        <ul className="plain">
          {stopsInOrder(day).map((s) => (
            <StopVideo key={s.order} tripKey={tripKey} dayIndex={dayIndex} s={s} city={rec.trip.destinations[0] ?? ''} us={us} />
          ))}
        </ul>
      </main>
    </div>
  );
}
