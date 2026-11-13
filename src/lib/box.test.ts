// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { BoxError, decodePublicKey, encodePublicKey, entryId, fingerprint, newDeviceKey, open, seal, unb64, b64, type Envelope } from './boxCrypto';
// @ts-expect-error -- düz JS aracı (yalnız Node'un yerleşik kitaplıkları)
import * as tool from '../../araclar/kutuya-koy.mjs';

const plan = readFileSync('src/sample/ornek-plan.json', 'utf8');

describe('plan kutusu şifrelemesi', () => {
  it('araçla (Node) şifrelenen plan uygulama koduyla açılır; iki cihaz da açar', async () => {
    const a = await newDeviceKey();
    const b = await newDeviceKey();
    const env = (await tool.seal(plan, [a.pubRaw, b.pubRaw])) as Envelope;
    expect(await open(env, a.priv, a.pubRaw)).toBe(plan);
    expect(await open(env, b.priv, b.pubRaw)).toBe(plan);
    // uygulamanın kendi seal'ı da aynı biçimde
    expect(await open(await seal(plan, [a.pubRaw]), a.priv, a.pubRaw)).toBe(plan);
  });
  it('başka cihazın anahtarıyla açılmaz (bu cihaza değil)', async () => {
    const a = await newDeviceKey();
    const c = await newDeviceKey();
    const env = (await tool.seal(plan, [a.pubRaw])) as Envelope;
    await expect(open(env, c.priv, c.pubRaw)).rejects.toMatchObject({ code: 'not-for-me' });
    // parmak izini taklit etse bile açılmaz
    const forged = { ...env, alicilar: [{ ...env.alicilar[0], pi: await fingerprint(c.pubRaw) }] };
    await expect(open(forged, c.priv, c.pubRaw)).rejects.toBeInstanceOf(BoxError);
  });
  it('tek baytı değiştirilen dosya reddedilir (şifreli metin, zaman, geçici anahtar)', async () => {
    const a = await newDeviceKey();
    const env = (await tool.seal(plan, [a.pubRaw])) as Envelope;
    const ct = unb64(env.sifreli);
    ct[100] ^= 1;
    await expect(open({ ...env, sifreli: b64(ct) }, a.priv, a.pubRaw)).rejects.toMatchObject({ code: 'bad' });
    await expect(open({ ...env, guncelleme: '2030-01-01T00:00:00.000Z' }, a.priv, a.pubRaw)).rejects.toMatchObject({ code: 'bad' });
    const sk = unb64(env.alicilar[0].sk);
    sk[0] ^= 1;
    await expect(open({ ...env, alicilar: [{ ...env.alicilar[0], sk: b64(sk) }] }, a.priv, a.pubRaw)).rejects.toMatchObject({ code: 'bad' });
  });
  it('anahtar metni ve parmak izi; özel anahtar dışa aktarılamaz', async () => {
    const a = await newDeviceKey();
    const t = encodePublicKey(a.pubRaw);
    expect(t.startsWith('tur-rehberi-anahtar:v1:')).toBe(true);
    expect(decodePublicKey(t)).toEqual(a.pubRaw);
    expect(decodePublicKey('tur-rehberi-anahtar:v1:bozuk')).toBeNull();
    expect(await fingerprint(a.pubRaw)).toMatch(/^[0-9a-f]{16}$/);
    expect(a.priv.extractable).toBe(false);
    await expect(crypto.subtle.exportKey('pkcs8', a.priv)).rejects.toBeTruthy();
    expect(await tool.entryId('ornek-gezi')).toBe(await entryId('ornek-gezi'));
  });
});

describe('kutuya-koy.mjs aracı', () => {
  it('planı doğrular, şifreler, dizini yazar; dizinde ve dosya adında açık metin yok; kaldırır', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'kutu-'));
    const a = await newDeviceKey();
    writeFileSync(join(dir, 'anahtarlar.txt'), `# test\niPhone ${encodePublicKey(a.pubRaw)}\n`);
    writeFileSync(join(dir, 'bolgeler.json'), JSON.stringify({ bolgeler: [] }));
    const p = JSON.parse(plan);
    p.id = 'viyana-2027-05';
    p.title = 'Viyana Gezisi Mayıs 2027';
    p.destinations = ['Viyana'];
    writeFileSync(join(dir, 'plan.json'), JSON.stringify(p));
    const run = (...args: string[]) => execFileSync(process.execPath, ['araclar/kutuya-koy.mjs', ...args, '--kutu', join(dir, 'kutu'), '--anahtarlar', join(dir, 'anahtarlar.txt'), '--bolgeler', join(dir, 'bolgeler.json')], { encoding: 'utf8' });
    const out = run(join(dir, 'plan.json'));
    expect(out).toContain('Kutuya kondu');
    expect(out).not.toMatch(/Viyana Gezisi|ÖRNEK/); // plan içeriği ekrana yazılmaz
    const files = readdirSync(join(dir, 'kutu'));
    expect(files).toHaveLength(2);
    const index = readFileSync(join(dir, 'kutu', 'index.json'), 'utf8');
    for (const s of ['viyana', 'Viyana', '2027', 'Mayıs', 'Gezisi']) expect(index).not.toContain(s);
    for (const f of files) expect(f).toMatch(/^(index|k-[0-9a-f]{16})\.json$/);
    const ix = JSON.parse(index);
    expect(ix.kayitlar[0].alicilar).toEqual([await fingerprint(a.pubRaw)]);
    const env = JSON.parse(readFileSync(join(dir, 'kutu', ix.kayitlar[0].dosya), 'utf8'));
    expect(JSON.stringify(env)).not.toContain('Viyana');
    expect(JSON.parse(await open(env, a.priv, a.pubRaw)).title).toBe('Viyana Gezisi Mayıs 2027');
    // bölge listesine gezinin alanı eklendi; adında tarih yok
    const reg = JSON.parse(readFileSync(join(dir, 'bolgeler.json'), 'utf8')).bolgeler;
    expect(reg).toHaveLength(1);
    expect(reg[0].id).toBe('viyana');
    expect(JSON.stringify(reg[0])).not.toContain('2027');
    // güncelleme: aynı kimlikte tek kayıt, eski dosya silinir
    expect(run(join(dir, 'plan.json'))).toContain('Güncellendi');
    expect(readdirSync(join(dir, 'kutu'))).toHaveLength(2);
    // geçersiz plan reddedilir
    writeFileSync(join(dir, 'bozuk.json'), JSON.stringify({ ...p, days: 'yok' }));
    expect(() => run(join(dir, 'bozuk.json'))).toThrow();
    // kaldır
    expect(run('--kaldir', 'viyana-2027-05')).toContain('çıkarıldı');
    expect(JSON.parse(readFileSync(join(dir, 'kutu', 'index.json'), 'utf8')).kayitlar).toHaveLength(0);
  });
});
