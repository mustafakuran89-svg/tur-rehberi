import { tr } from '../i18n/tr';
import { paths } from '../lib/router';
import { Header } from '../components/ui';

declare const __APP_VERSION__: string;

export function WhatsNewScreen() {
  return (
    <div className="page">
      <Header title={tr.whatsnew.title} back={paths.settings()} kicker={tr.settings.version(__APP_VERSION__, '').replace(/ · $/, '')} />
      <main className="content">
        <ul className="bullets whatsnew" data-testid="whatsnew">
          {tr.whatsnew.items.map((x, i) => (
            <li key={i}>{x}</li>
          ))}
        </ul>
      </main>
    </div>
  );
}
