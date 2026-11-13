# Plan kutusu — plan üreticisinin adımları

Plan kutusu, yeni gezi planını kullanıcının iPhone'una dosya göndermeden ulaştırır. Plan şifrelenir ve sitedeki `kutu/` klasörüne konur. Uygulama açılınca kutuya bakar, bu cihaza şifrelenmiş planı indirir, açar ve içe aktarır. Site herkese açıktır, ama planı yalnız anahtarı listede olan cihaz açabilir.

## Bir kez: cihaz anahtarını ekle

1. Kullanıcı iPhone'da **Ayarlar › Plan kutusu › Kopyala**'ya dokunur ve metni size iletir. Metin `tur-rehberi-anahtar:v1:` ile başlar.
2. Depoda `kutu/anahtarlar.txt` dosyasına bir satır ekleyin: etiket, bir boşluk, anahtar.

   ```
   iPhone tur-rehberi-anahtar:v1:BEIx...
   ```

3. Bu bir açık anahtardır, gizli değildir; depoda durabilir. Özel anahtar cihazdan hiç çıkmaz.

İkinci bir cihaz (iPad, Mac) için aynı şekilde bir satır daha ekleyin. Plan, listedeki bütün cihazlara ayrı ayrı şifrelenir.

## Her gezide

1. Depoyu alın ya da güncelleyin: `git pull`.
2. Planı `plan.schema.json` sözleşmesine uygun üretin ve depo **dışında** bir yere kaydedin. Açık metin planı depoya koymayın.
3. Depo kökünde aracı çalıştırın:

   ```
   node araclar/kutuya-koy.mjs C:\yol\viyana-2027-05.json
   ```

   Araç şunları yapar:
   - Planı şemaya göre doğrular; geçersizse reddeder ve sorunları listeler.
   - Planı şifreler, `public/kutu/k-<rastgele>.json` dosyasını yazar ve `public/kutu/index.json`'u günceller.
   - Aynı kimlikli gezi zaten kutudaysa eski dosyayı siler. Uygulama bunu "Güncellendi" olarak alır; kullanıcının işaretleri ve notları korunur.
   - Gezinin alanı hiçbir çevrimdışı harita bölgesine sığmıyorsa `haritalar/bolgeler.json`'a bir bölge ekler. Bölge adında tarih yazmaz.
4. Gönderin:

   ```
   git add public/kutu haritalar/bolgeler.json
   git commit -m "Kutu: yeni gezi"
   git push
   ```

   Yayın iş akışı kendiliğinden çalışır (1-3 dakika). Uygulama bir sonraki açılışta ya da **Ayarlar › Plan kutusu › Kutuyu denetle** ile planı alır.

Bir geziyi kutudan çıkarmak için:

```
node araclar/kutuya-koy.mjs --kaldir viyana-2027-05
```

Cihazdaki kopya silinmez; kullanıcı kendisi siler.

## Sitede kim neyi görür

| Herkes görebilir | Kimse göremez (anahtarı olmayan) |
|---|---|
| Kutudaki dosya sayısı ve boyutları | Gezi adı, şehir, tarihler, duraklar, otel, uçuş |
| Güncelleme zamanları | Planın herhangi bir satırı |
| Alıcı cihazların açık anahtar parmak izleri | Özel anahtar (cihazdan hiç çıkmaz) |
| Çevrimdışı harita bölgelerinin sınırları (`haritalar/bolgeler.json`) | |

Dizin kaydının kimliği, gezi kimliğinin SHA-256 özetidir; açık metin değildir. Gezi kimliği tahmin edilebilir bir dizgeyse (örneğin `viyana-2027-05`) özet denenerek eşleştirilebilir. Bunu istemiyorsanız gezi kimliğine rastgele bir ek koyun (`viyana-2027-05-k7q2`).

## Anahtar kaybolursa

iPhone'da site verisi silinirse cihaz yeni bir anahtar üretir. Ayarlar'da bunun notu çıkar.

1. Yeni anahtarı alın.
2. `kutu/anahtarlar.txt` içindeki eski satırı değiştirin.
3. Gezileri aracı yeniden çalıştırarak tekrar kutuya koyun.

## Şifreleme

Algoritmalar tarayıcının ve Node'un yerleşik Web Crypto arayüzündendir; ek kitaplık yoktur.

- **Cihaz anahtarı:** ECDH, P-256 eğrisi.
- **Plan:** gzip ile sıkıştırılır, sonra tek kullanımlık 256 bitlik anahtarla AES-GCM ile şifrelenir.
- **İçerik anahtarı:** Her gönderimde geçici bir P-256 anahtarı üretilir. Her alıcı için ECDH ve HKDF-SHA-256 ile bir AES-GCM anahtarı türetilir; içerik anahtarı bununla sarılır.
- **Bütünlük:** Zarfın sürümü, zamanı ve geçici açık anahtarı şifreye bağlıdır (AES-GCM ek verisi). Tek bayt değişirse dosya açılmaz ve uygulama "bozuk ya da değiştirilmiş" der.
