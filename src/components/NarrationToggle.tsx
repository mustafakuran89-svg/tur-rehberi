import { tr } from '../i18n/tr';
import type { Stop } from '../plan/types';
import { estimateMinutes, narrationFor } from '../lib/narration';

/** "Kısa anlatım" / "Uzun anlatım" anahtarı; yanında yaklaşık süre. Ekrandaki metin de seçime göre değişir. */
export function NarrationToggle({ stop, value, onChange, rate }: { stop: Pick<Stop, 'narration' | 'narrationShort'>; value: 'short' | 'long'; onChange: (v: 'short' | 'long') => void; rate: number }) {
  return (
    <div className="segmented narration-toggle" role="radiogroup" aria-label={tr.player.lengthLabel} data-testid="narration-toggle">
      {(['short', 'long'] as const).map((k) => (
        <button key={k} role="radio" aria-checked={value === k} className={`seg${value === k ? ' on' : ''}`} onClick={() => onChange(k)} data-testid={`narr-${k}`}>
          {k === 'short' ? tr.player.short : tr.player.long}
          <span className="small"> · {tr.player.about(estimateMinutes(narrationFor(stop, k).text, rate))}</span>
        </button>
      ))}
    </div>
  );
}
