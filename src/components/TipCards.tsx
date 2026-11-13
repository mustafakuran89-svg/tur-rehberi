// İpucu kartları (Geliştirme 4, Aşama C): soru başlıklı kart; adımlar numaralı ve işaretlenebilir
// (kullanıcı durumunda kalıcı); bağlantı varsa düğme; "Dinle" düğmesi. İpucu kendiliğinden
// seslendirilmez. Uygulama ipucu üretmez; yalnız planla geleni gösterir (değişmez kural 17).
import { tr } from '../i18n/tr';
import type { Tip } from '../plan/types';
import { slug, updateUserState, type UserState } from '../lib/userState';
import { speak } from '../lib/speech';

export const tipKey = (owner: string, t: Pick<Tip, 'title'>) => `${owner}|${slug(t.title)}`;
const safe = (u?: string | null) => (u && /^https:\/\//.test(u) ? u : null);

export function TipCard({ tip, owner, tripId, us, context }: { tip: Tip; owner: string; tripId: string; us: UserState | undefined; context?: string }) {
  const k = tipKey(owner, tip);
  const done = new Set(us?.tipSteps?.[k] ?? []);
  const url = safe(tip.url);
  const toggle = (i: number) =>
    updateUserState(tripId, (u) => {
      const cur = new Set(u.tipSteps?.[k] ?? []);
      if (cur.has(i)) cur.delete(i);
      else cur.add(i);
      return { ...u, tipSteps: { ...(u.tipSteps ?? {}), [k]: [...cur].sort((a, b) => a - b) } };
    });
  const say = () => speak([tip.title, tip.text, ...(tip.steps ?? []).map((s, i) => `${i + 1}. ${s}`)].join('\n\n'), 'tr-TR');
  return (
    <article className={`card tip-card tip-${tip.kind ?? 'other'}`} data-testid="tip" data-kind={tip.kind ?? 'other'} data-when={tip.when ?? 'any'}>
      <div className="card-kicker">
        {tr.tips.kinds[tip.kind ?? 'other']}
        {context && ` · ${context}`}
      </div>
      <h3 className="tip-title">{tip.title}</h3>
      <p>{tip.text}</p>
      {tip.steps && tip.steps.length > 0 && (
        <ol className="tip-steps">
          {tip.steps.map((s, i) => (
            <li key={i} className={done.has(i) ? 'done' : ''}>
              <label className="check">
                <input type="checkbox" checked={done.has(i)} onChange={() => toggle(i)} data-testid="tip-step" />
                <span>{s}</span>
              </label>
            </li>
          ))}
        </ol>
      )}
      <div className="row">
        {url && (
          <a className="btn btn-small" href={url} target="_blank" rel="noopener noreferrer" data-testid="tip-url">
            {tr.tips.open}
          </a>
        )}
        <button className="btn btn-small btn-ghost" onClick={say} data-testid="tip-listen">
          🔊 {tr.tips.listen}
        </button>
      </div>
    </article>
  );
}

export function TipCards({ tips, owner, tripId, us, title, testid = 'tips' }: { tips: Tip[] | undefined; owner: string; tripId: string; us: UserState | undefined; title?: string; testid?: string }) {
  if (!tips?.length) return null;
  return (
    <section className="tips" data-testid={testid}>
      {title && <h2 className="section-title">{title}</h2>}
      {tips.map((t, i) => (
        <TipCard key={i} tip={t} owner={owner} tripId={tripId} us={us} />
      ))}
    </section>
  );
}
