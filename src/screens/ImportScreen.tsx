import { useRef, useState } from 'react';
import { tr } from '../i18n/tr';
import { processImportText, type ImportResult } from '../plan/importPlan';
import type { SchemaProblem } from '../plan/validate';
import type { Trip } from '../plan/types';
import { getTrip, requestPersist, saveImported } from '../lib/store';
import { diffIsEmpty, diffPlans } from '../plan/diff';
import { saveSharedUser } from '../lib/share';
import type { UserState } from '../lib/userState';
import { formatDate } from '../lib/format';
import { go, href, paths } from '../lib/router';
import { Confirm, Header } from '../components/ui';

const MAX_SHOWN = 30;

export function ImportScreen() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState('');
  const [problems, setProblems] = useState<SchemaProblem[] | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [done, setDone] = useState<string[]>([]);
  const [pending, setPending] = useState<{ items: Extract<ImportResult, { kind: 'trips' }>['items']; existing: { title: string; date: string }; fromBackup: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  const sharedRef = useRef<Partial<UserState> | undefined>(undefined);

  async function save(items: Extract<ImportResult, { kind: 'trips' }>['items'], fromBackup: boolean) {
    const msgs: string[] = [];
    let last: Trip | null = null;
    for (const it of items) {
      const old = await getTrip(it.trip.id);
      await saveImported(it.trip);
      if (old && !fromBackup) {
        // Kullanıcı durumu ayrı depoda durduğu için değişmez; neyin değiştiği özetlenir.
        const d = diffPlans(old.trip, it.trip);
        msgs.push(tr.importer.updated);
        if (diffIsEmpty(d)) msgs.push(tr.importer.diffNone);
        if (d.added.length) msgs.push(tr.importer.diffAdded(d.added.map((x) => `${x.name} (${formatDate(x.date)})`).join(', ')));
        if (d.removed.length) msgs.push(tr.importer.diffRemoved(d.removed.map((x) => `${x.name} (${formatDate(x.date)})`).join(', ')));
        if (d.timeChanged.length) msgs.push(tr.importer.diffTime(d.timeChanged.map((x) => `${x.name}: ${x.from || '—'} → ${x.to || '—'}`).join(', ')));
      }
      last = it.trip;
      if (!fromBackup) {
        msgs.push(tr.importer.saved(it.trip.title));
        if (it.filled) msgs.push(tr.importer.filledLegs(it.filled));
        if (it.warnings.length) msgs.push(tr.importer.savedWarnings(it.warnings.length));
      }
    }
    if (fromBackup) msgs.push(tr.importer.backupSaved(items.length));
    if (sharedRef.current && last) {
      await saveSharedUser(last.id, sharedRef.current);
      msgs.push(tr.share.imported);
    }
    await requestPersist();
    setDone(msgs);
    setLastId(items.length === 1 && last ? last.id : null);
    if (items.length === 1 && last && msgs.length <= 3) setTimeout(() => go(paths.summary(last!.id)), 600);
  }

  async function run(input: string) {
    setProblems(null);
    setMessage(null);
    setDone([]);
    setBusy(true);
    try {
      const r = processImportText(input);
      if (r.kind === 'error') {
        if (r.message) setMessage(r.message);
        else {
          setMessage(tr.importer.schemaFail(r.problems.length));
          setProblems(r.problems);
        }
        return;
      }
      sharedRef.current = r.sharedUser;
      // Aynı kimlikli gezi varsa önce sor
      for (const it of r.items) {
        const ex = await getTrip(it.trip.id);
        if (ex) {
          setPending({ items: r.items, existing: { title: ex.trip.title, date: formatDate(ex.importedAt.slice(0, 10)) }, fromBackup: r.fromBackup });
          return;
        }
      }
      await save(r.items, r.fromBackup);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="page">
      <Header title={tr.importer.title} back={paths.trips()} />
      <main className="content">
        <p className="lead">{tr.importer.intro}</p>
        <input
          ref={fileRef}
          type="file"
          accept=".json,application/json,text/plain"
          hidden
          data-testid="file-input"
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            try {
              await run(await f.text());
            } catch {
              setMessage(tr.importer.readFail);
            }
          }}
        />
        <button className="btn btn-primary btn-big btn-block" onClick={() => fileRef.current?.click()} disabled={busy}>
          📄 {tr.importer.chooseFile}
        </button>

        <section>
          <h2 className="section-title">{tr.importer.pasteTitle}</h2>
          <button
            className="btn"
            onClick={async () => {
              try {
                const t = await navigator.clipboard.readText();
                setText(t);
              } catch {
                setMessage(tr.importer.clipboardFail);
              }
            }}
          >
            📋 {tr.importer.pasteButton}
          </button>
          <textarea
            className="paste"
            data-testid="paste"
            rows={6}
            placeholder={tr.importer.pastePlaceholder}
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn btn-primary btn-block" data-testid="paste-import" onClick={() => run(text)} disabled={busy || !text.trim()}>
            {tr.importer.check}
          </button>
        </section>

        {message && (
          <div className="error" role="alert" data-testid="import-error">
            {message}
          </div>
        )}
        {problems && (
          <ul className="problems" data-testid="problems">
            {problems.slice(0, MAX_SHOWN).map((p, i) => (
              <li key={i}>
                <strong>{p.path}</strong>: {p.message}
              </li>
            ))}
            {problems.length > MAX_SHOWN && <li>{tr.importer.moreProblems(problems.length - MAX_SHOWN)}</li>}
          </ul>
        )}
        {done.length > 0 && (
          <div className="ok-box" role="status" data-testid="import-ok">
            {done.map((d, i) => (
              <p key={i}>{d}</p>
            ))}
            {lastId && (
              <a className="btn btn-small" href={href(paths.summary(lastId))} data-testid="open-trip">
                {tr.importer.openTrip}
              </a>
            )}
          </div>
        )}
      </main>
      {pending && (
        <Confirm
          title={tr.importer.replaceTitle}
          body={tr.importer.replaceBody(pending.existing.title, pending.existing.date)}
          okText={tr.importer.replace}
          onCancel={() => setPending(null)}
          onOk={async () => {
            const p = pending;
            setPending(null);
            await save(p.items, p.fromBackup);
          }}
        />
      )}
    </div>
  );
}
