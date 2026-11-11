import { tr } from '../i18n/tr';
import { formatDate } from '../lib/format';
import { paths } from '../lib/router';
import { Header, Loading, Missing, SampleBadge, useTrip } from '../components/ui';

export function PracticalScreen({ tripKey }: { tripKey: string }) {
  const { rec } = useTrip(tripKey);
  if (rec === undefined) return <Loading />;
  if (!rec) return <Missing />;
  const t = rec.trip;
  const p = t.practical;
  return (
    <div className="page">
      <Header title={tr.practical.title} back={paths.summary(tripKey)} kicker={<>{t.title} {rec.isSample && <SampleBadge />}</>} />
      <main className="content">
        <section>
          <h2 className="section-title">{tr.practical.transport}</h2>
          <p>{p.transport}</p>
        </section>
        <section>
          <h2 className="section-title">{tr.practical.money}</h2>
          <p>{p.moneyAndTipping}</p>
        </section>
        <section>
          <h2 className="section-title">{tr.practical.closedDays}</h2>
          <p>{p.closedDays}</p>
        </section>
        <section>
          <h2 className="section-title">{tr.practical.emergency}</h2>
          <ul className="plain">
            {p.emergency.map((e, i) => (
              <li key={i} className="emergency">
                <span>{e.label}</span>{' '}
                <a className="btn btn-small" href={`tel:${e.number.replace(/[^\d+]/g, '')}`}>
                  {e.number}
                </a>
              </li>
            ))}
          </ul>
        </section>
        {p.notes && p.notes.length > 0 && (
          <section>
            <h2 className="section-title">{tr.practical.notes}</h2>
            <ul className="bullets">{p.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>
          </section>
        )}
        <section>
          <h2 className="section-title">{tr.practical.sources}</h2>
          <ul className="bullets">
            {t.sources.map((s, i) => (
              <li key={i}>
                <a href={s.url} target="_blank" rel="noopener noreferrer">
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
          <p className="muted">{tr.practical.verified(formatDate(t.verifiedAt))}</p>
          <p className="note small">{tr.checkBeforeGo}</p>
        </section>
      </main>
    </div>
  );
}
