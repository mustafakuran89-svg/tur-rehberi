import { tr } from '../i18n/tr';
import { stopsInOrder } from '../plan/normalize';
import type { Stop } from '../plan/types';
import { href, paths } from '../lib/router';
import type { UserState } from '../lib/userState';
import { setSettings, useSettings } from '../lib/settings';
import { chapterLine, VideoPlayer, useStopVideos, videoMeta } from '../components/VideoCard';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

function StopVideo({ tripKey, dayIndex, s, city, us }: { tripKey: string; dayIndex: number; s: Stop; city: string; us: UserState | undefined }) {
  // Bu sayfa arama yapmaz (kota); planla gelen, sabitlenen, kanal dizinindeki ve önbellekteki adaylar gösterilir.
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
          {chapterLine(v) && <p className="small video-chapter">{chapterLine(v)}</p>}
        </>
      ) : (
        <p className="muted small">{tr.video.noneForStop}</p>
      )}
    </li>
  );
}

/** "Sonra izle" listesi: çevrimdışıyken eklenen videolar; bağlantı gelince buradan izlenir. */
export function WatchLater() {
  const s = useSettings();
  return (
    <section className="settings-group" data-testid="watch-later-list">
      <h2 className="section-title">{tr.video.watchLaterTitle}</h2>
      {s.watchLater.length === 0 ? (
        <p className="muted small">{tr.video.watchLaterEmpty}</p>
      ) : (
        <ul className="plain">
          {s.watchLater.map((w) => (
            <li key={w.youtubeId} className="card" data-testid="watch-later-item">
              {w.stopName && <h3>{w.stopName}</h3>}
              <VideoPlayer v={{ youtubeId: w.youtubeId, title: w.title, channel: w.channel, startSeconds: w.start, endSeconds: w.end }} />
              <p className="video-title">{w.title}</p>
              {chapterLine({ startSeconds: w.start, endSeconds: w.end, chapterTitle: w.stopName }) && <p className="small video-chapter">{chapterLine({ startSeconds: w.start, endSeconds: w.end, chapterTitle: w.stopName })}</p>}
              <button className="btn btn-small btn-ghost" onClick={() => setSettings({ watchLater: s.watchLater.filter((x) => x.youtubeId !== w.youtubeId) })} data-testid="watch-later-remove">
                {tr.video.watchLaterRemove}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
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
        <WatchLater />
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
