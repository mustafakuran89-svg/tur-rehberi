// Örnek gezi üreticisi (şema sürüm 2). Çıktı: src/sample/ornek-plan.json
// Sürüm 2 alanlarında da uydurma bilgi gerçek gibi sunulmaz: Michelin derecesi, etkinlik, uçuş,
// otel ve rezervasyon bağlantısı ÖRNEK etiketlidir ve example.com adreslerine gider. Görseller
// Wikimedia Commons'tan alınmış gerçek, özgür lisanslı genel fotoğraflardır (eser sahibi ve lisans).
// Bütün mekanlar uydurmadır ve "ÖRNEK" etiketi taşır. Koordinatlar gerçek bir mekanı
// göstermez; bir merkez noktanın çevresine metre cinsinden kaydırılarak yerleştirilir.
import { writeFileSync, mkdirSync } from 'node:fs';

const CENTER = { lat: 44.4938, lng: 11.3426 };
const at = (northM, eastM) => ({
  lat: +(CENTER.lat + northM / 111320).toFixed(6),
  lng: +(CENTER.lng + eastM / (111320 * Math.cos((CENTER.lat * Math.PI) / 180))).toFixed(6),
});
const src = (slug) => [
  { title: 'ÖRNEK kaynak A', url: `https://example.com/ornek/${slug}` },
  { title: 'ÖRNEK kaynak B', url: `https://example.org/ornek/${slug}` },
];
const V = '2026-11-11';
const IMG_TOWER = {
  url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/3f/Krakow_2024_068_Old_Town_Hall_Tower.jpg/960px-Krakow_2024_068_Old_Town_Hall_Tower.jpg',
  credit: 'Scotch Mist',
  license: 'CC BY-SA 4.0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Krakow_2024_068_Old_Town_Hall_Tower.jpg',
};
const IMG_TERRACE = {
  url: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/c/c0/Table_set_on_terrace_over_water%2C_Venice.jpg/960px-Table_set_on_terrace_over_water%2C_Venice.jpg',
  credit: 'Gerda Arendt',
  license: 'CC0',
  sourceUrl: 'https://commons.wikimedia.org/wiki/File:Table_set_on_terrace_over_water,_Venice.jpg',
};
const every = (iv) => ({ mon: [iv], tue: [iv], wed: [iv], thu: [iv], fri: [iv], sat: [iv], sun: [iv] });
const notMon = (iv) => ({ tue: [iv], wed: [iv], thu: [iv], fri: [iv], sat: [iv], sun: [iv] });
const FAKE_PHONE = '+00 000 000 0000';

const stop = (order, name, kind, pos, extra) => ({
  order,
  name: `ÖRNEK ${name}`,
  kind,
  lat: pos ? pos.lat : null,
  lng: pos ? pos.lng : null,
  coordSource: pos ? 'other' : null,
  address: `ÖRNEK ${name} Sokağı No: ${order}, ÖRNEK Kent`,
  visitMinutes: kind === 'main' ? 60 : 20,
  openHours: '09:00-18:00',
  closedDays: 'Pazartesi',
  closedWeekdays: ['mon'],
  fee: kind === 'main' ? '10 Avro' : 'Ücretsiz',
  ticketOrBooking: null,
  bestTime: 'Sabah erken',
  sources: src(`durak-${order}-${name.toLowerCase().replace(/[^a-z]+/g, '-')}`),
  verifiedAt: V,
  ...extra,
});

const venue = (code, name, pos, extra) => ({
  code,
  name: `ÖRNEK ${name}`,
  lat: pos.lat,
  lng: pos.lng,
  coordSource: 'other',
  address: `ÖRNEK ${name} Caddesi, ÖRNEK Kent`,
  whatToEat: ['ÖRNEK ev yapımı makarna', 'ÖRNEK mevsim salatası'],
  priceLevel: 2,
  reservation: 'none',
  reservationNote: null,
  closedDays: null,
  closedWeekdays: [],
  queueNote: null,
  suitsWhom: 'Herkese uygun, sade bir seçenek.',
  sources: src(`mekan-${code.toLowerCase()}`),
  verifiedAt: V,
  ...extra,
});

const N = {
  meydan:
    'Bu meydan uydurma bir kentin uydurma kalbidir; burada anlatılan her şey uygulamayı denemeniz için yazıldı. Hikayeye göre kent, iki dere arasındaki bu düzlükte kurulan haftalık pazarla doğdu. Köylüler buğdaylarını, çömlekçiler testilerini buraya getirdi; pazar büyüdükçe çevresine evler, evlerin arasına sokaklar eklendi. Meydanın ortasındaki taş çeşme pazarın ilk günlerinden kalmadır derler, ama bu bir rivayettir. Şimdi çevrenize bakın. Kemerli revakların altında gölge arayan insanları göreceksiniz. Yerdeki taşların bazıları ötekilerden daha koyudur; eski pazar tezgahlarının yerini gösterir. Saat kulesine doğru dönün ve kulenin altındaki küçük kapıya dikkat edin. Bir sonraki durağa o kapının önünden geçerek gideceğiz. Acele etmeyin, çeşmenin suyundan bir yudum alın ve meydanın sesini dinleyin.',
  kule:
    'Saat kulesi, rivayete göre, bir tüccarın kente armağanıdır. Tüccar uzak limanlardan döndüğünde herkesin aynı saati bilmesini istemiş, çünkü pazarın ne zaman açılıp kapanacağı her gün tartışma konusu olurmuş. Kule önce ahşaptan yapılmış, yangından sonra taşla yeniden kurulmuş. Bu bilgiler örnek içindir; gerçek bir kuleye ait değildir. Kulenin dibinde durun ve yukarı bakın. Saatin kadranında rakam yerine on iki küçük kabartma göreceksiniz. Her biri bir ayı ve o ayın işini anlatır: hasat, bağbozumu, odun kesimi. Merdivenler dar ve diktir, yukarı çıkarsanız tırabzana tutunun. Tepeden bakınca kırmızı kiremitli çatıların arasında iki derenin izini sürebilirsiniz. Kent hala onların çizdiği yolu izler.',
  muze:
    'Bu küçük müze, kentin uydurma tarihini anlatan eşyaları bir araya getirir. Anlatım uygulamayı denemek için yazıldı; burada sözü geçen eşyalar gerçek değildir. İlk salonda pazar günlerinden kalan tartılar ve ölçü kapları durur. Tüccarlar birbirine güvenmezmiş, bu yüzden kentin resmi ölçüleri bu salonda saklanırmış. İkinci salona geçince duvardaki büyük haritaya bakın. Haritada kent bugünkünden çok küçüktür ve iki derenin arasında bir ada gibi durur. Haritanın köşesindeki imzayı bulmaya çalışın. Kimin çizdiği bilinmez, ama imzanın yanında küçük bir balık resmi vardır. Son salonda pencerenin önüne oturup biraz dinlenin. Avlunun ortasındaki limon ağacı müzenin en yaşlı sakinidir, en azından öyle anlatılır.',
  bahce:
    'Bu bahçe bir zamanlar bir manastırın sebze bahçesiymiş. Bu da örnek bir hikayedir. Keşişler burada kent pazarına satılacak otları yetiştirirmiş; fesleğen, adaçayı ve kekik hala bahçenin kenarlarında kendiliğinden büyür. Yürüyüş yolunu izleyin ve ilk kavşakta sola dönün. Taş bir havuzun başına varacaksınız. Havuzun suyu yukarıdaki dereden gelir ve hiç kurumadığı söylenir. Kenardaki taşlara oyulmuş harfleri görebilirsiniz; her biri bahçede çalışan bir ailenin baş harfidir. Öğleden sonra güneş havuzun suyuna vurunca bahçenin bütün renkleri değişir. Burası yürüyüşe ara vermek için iyi bir yerdir. Bankların birine oturun, kentin uğultusunun ne kadar uzaktan geldiğine dikkat edin.',
  kopru:
    'Eski köprü iki dereden büyüğünün üzerinden geçer. Örnek hikayeye göre köprü yapılmadan önce dereyi bir salla geçerlermiş ve salcı, kentin en zengin adamıymış. Köprü yapılınca salcı işsiz kalmış, ama kent ona köprünün ortasındaki küçük evi vermiş. O ev hala oradadır; şimdi bir dondurmacıdır. Köprünün ortasına gelince durun ve akıntı yönüne bakın. Suyun içinde eski sal iskelesinin taşlarını görebilirsiniz. Köprünün korkuluklarında yüzlerce küçük çentik vardır. Her yıl ilk sel geldiğinde suyun yüksekliği buraya işaretlenirmiş. En yüksek çentiği bulun; o yıl suyun köprünün üstünden aştığı anlatılır. Bu anlatım uygulamayı denemek için yazıldı.',
  pazar:
    'Kapalı pazar, meydandaki açık pazarın büyüyüp çatı altına girmiş halidir. Bu bir örnek anlatımdır. Sabahları balıkçılar, öğleye doğru peynirciler ve fırıncılar tezgah açar. İçeri girince önce kokuya dikkat edin; her koridorun kendine ait bir kokusu vardır. Sağdaki koridor taze ekmek, soldaki olgun peynir kokar. Ortadaki büyük tezgahta yerel zeytinyağları sıralanır ve satıcılar tatmanız için ekmek dilimleri uzatır. Tavana bakın; demir kirişlerin arasında eski pazar fenerleri asılıdır. Pazarın çıkışında küçük bir kahve tezgahı vardır, ayakta içilen sert bir kahveyle yola devam edebilirsiniz. Akşamüstü pazar erken kapanır, alışverişi öğleden önce yapın.',
  surlar:
    'Kent surlarının bu bölümü, örnek hikayede kentin en eski parçasıdır. Surlar pazarı ve evleri korumak için yapılmış, ama hiçbir zaman büyük bir kuşatma görmemiş. Kentliler bu yüzden surlara biraz da gülümseyerek bakar. Surun üstündeki yürüyüş yolunu izleyin. Her yüz adımda bir küçük gözetleme kulesi göreceksiniz. Kulelerin duvarlarında nöbetçilerin can sıkıntısından kazıdığı resimler vardır: gemiler, atlar ve bir tanesinde de çok büyük bir peynir. Batıya dönük kulede durun. Gün batımında güneş tam karşıdaki tepenin ardına iner ve surların taşları kızıla boyanır. Bu anlatım uygulamayı denemek içindir; burada anlatılanlar gerçek bir yere ait değildir.',
  teras:
    'Bu teras kentin en yüksek noktasıdır ve günü bitirmek için seçildi. Örnek hikayeye göre burada bir zamanlar rüzgar değirmeni varmış; pazarın unu burada öğütülürmüş. Değirmen yıkılmış ama taşları terasın duvarına örülmüş. Duvarın üstündeki yuvarlak taşı bulun; değirmenin eski taşıdır. Buradan bakınca gün boyunca gezdiğiniz yerleri tek tek seçebilirsiniz: meydan, saat kulesi, köprü ve surlar. Akşam ışıkları yanmaya başlayınca kentin iki derenin arasına nasıl sıkıştığını daha iyi görürsünüz. Rüzgar sert eser, yanınıza bir hırka alın. Bu anlatım örnektir; uygulamanın sesli anlatımını denemeniz için yazıldı.',
};

const day1Stops = [
  stop(1, 'Pazar Meydanı', 'main', at(0, 0), { closedDays: null, closedWeekdays: [], fee: 'Ücretsiz', openHours: 'Her saat açık', narrationShort: 'Bu meydan uydurma bir kentin uydurma kalbidir. Kent, iki dere arasındaki düzlükte kurulan haftalık pazarla doğdu; ortadaki taş çeşmenin pazarın ilk günlerinden kaldığı anlatılır. Kemerli revaklara, yerdeki koyu taşlara ve saat kulesinin altındaki küçük kapıya bakın. Sonraki durağa o kapının önünden geçeceğiz. Bu anlatım örnektir.', lookFor: ['Ortadaki taş çeşme', 'Yerdeki koyu renkli taşlar: eski tezgahların yeri', 'Saat kulesinin altındaki küçük kapı'], videoQuery: 'tarihi pazar meydanı belgesel', narration: N.meydan, practicalLine: 'En iyi sabah dokuzdan önce; çeşmenin suyu içilebilir.', legToNext: { mode: 'walk', minutes: 6, approx: false } }),
  stop(2, 'Saat Kulesi', 'main', at(320, 180), { hours: notMon(['09:00', '18:00']), ticketUrl: 'https://example.com/ornek/kule-bileti', website: 'https://example.com/ornek/saat-kulesi', ticketOrBooking: 'Saatli bilet; ÖRNEK bilet sayfasından alınır.', narrationShort: 'Saat kulesi, rivayete göre uzak limanlardan dönen bir tüccarın kente armağanıdır. Önce ahşaptan yapılmış, yangından sonra taşla yeniden kurulmuş. Kadranda rakam yerine on iki ayın işini anlatan kabartmalar vardır. Merdiven dar; tırabzana tutunun. Bu anlatım örnektir.', lookFor: ['Kadrandaki on iki kabartma', 'Tepeden kırmızı kiremitli çatılar', 'Çatılar arasında iki derenin izi'], videoQuery: 'saat kulesi tarihi belgesel', wikipediaTr: 'Saat kulesi', images: [IMG_TOWER], narration: N.kule, practicalLine: 'Merdiven dar; 20 dakika ayırın, çantayı aşağıda bırakın.', legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(3, 'Kent Müzesi', 'main', at(560, -120), { hours: notMon(['10:00', '17:30']), website: 'https://example.com/ornek/kent-muzesi', phone: FAKE_PHONE, lookFor: ['İlk salondaki ölçü kapları', 'Büyük haritadaki imza ve balık resmi'], narration: N.muze, practicalLine: 'Bilet girişte alınır; müze pazartesi kapalı.', legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(4, 'Çeşme Sokağı', 'minor', at(800, 60), { narration: 'Bu dar sokak, adını sokağın başındaki küçük çeşmeden alır. Örnek bir duraktır. Çeşmenin üstündeki aslan başına dikkat edin, ağzından değil kulağından su akar.', practicalLine: 'Fotoğraf için öğleden önce gelin.', visitMinutes: 15, closedDays: null, closedWeekdays: [], fee: null, legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(5, 'Manastır Bahçesi', 'main', at(1050, 320), { narration: N.bahce, practicalLine: 'Gölgelik az; şapka ve su alın.', legToNext: null }),
];

const day2Stops = [
  stop(1, 'Eski Köprü', 'main', at(-300, -250), { narration: N.kopru, practicalLine: 'Köprü her saat açık; sabah erken sakin.', closedDays: null, closedWeekdays: [], fee: 'Ücretsiz', legToNext: { mode: 'walk', minutes: 7, approx: false } }),
  stop(2, 'Kapalı Pazar', 'main', at(-520, 30), { narration: N.pazar, practicalLine: 'Öğleden önce gelin; nakit getirin.', closedDays: 'Pazar', closedWeekdays: ['sun'], fee: 'Ücretsiz', legToNext: { mode: 'walk', minutes: null, approx: false } }),
  stop(3, 'Gizli Avlu', 'minor', null, { narration: 'Bu avlunun koordinatı bilerek boş bırakıldı; uygulama onu haritaya koymaz, adresiyle listeler. Örnek bir duraktır.', practicalLine: 'Koordinatı olmayan yerlerin nasıl göründüğünü gösterir.', visitMinutes: 15, closedDays: null, closedWeekdays: [], fee: null, legToNext: { mode: 'walk', minutes: 8, approx: false } }),
  stop(4, 'Sur Kapısı', 'main', at(-900, 350), { narration: N.surlar, practicalLine: 'Surun üstü rüzgarlı; kaygan taşlara dikkat.', legToNext: { mode: 'drive', minutes: null, approx: false } }),
  stop(5, 'Tepe Terası', 'main', at(-1900, 1400), { narration: N.teras, practicalLine: 'Gün batımından yarım saat önce orada olun.', closedDays: null, closedWeekdays: [], fee: 'Ücretsiz', bestTime: 'Gün batımı', legToNext: null }),
];

const breakfasts = (base) => [
  venue('K1', 'Fırın Kahvaltısı', at(base[0] - 80, base[1] - 60), { hours: every(['07:00', '11:30']), whatToEat: ['ÖRNEK sıcak çörek', 'ÖRNEK kaymaklı tost'], priceLevel: 1, suitsWhom: 'Hızlı ve ekonomik başlamak isteyenlere.' }),
  venue('K2', 'Avlu Kahvesi', at(base[0] + 60, base[1] - 140), { whatToEat: ['ÖRNEK yumurtalı tava', 'ÖRNEK reçel tabağı'], priceLevel: 2, suitsWhom: 'Sakin, oturarak kahvaltı isteyenlere.' }),
  venue('K3', 'Pazar Tezgahı', at(base[0] - 150, base[1] + 90), { whatToEat: ['ÖRNEK peynirli ekmek', 'ÖRNEK taze sıkma meyve suyu'], priceLevel: 1, queueNote: 'Sabah 9 civarı kuyruk olur.', suitsWhom: 'Yerlilerin arasında ayakta kahvaltı edenlere.' }),
];
const dinners = (base) => [
  venue('A1', 'Usta Lokantası', at(base[0] + 100, base[1] + 120), { hours: every(['18:30', '23:30']), phone: FAKE_PHONE, michelin: { distinction: 'bib-gourmand', greenStar: false, year: 2026, url: 'https://example.com/ornek/michelin-usta' }, whatToEat: ['ÖRNEK yöre makarnası', 'ÖRNEK fırın sebze'], priceLevel: 2, reservation: 'recommended', reservationNote: 'Hafta sonu bir gün önceden arayın.', suitsWhom: 'Yörenin klasik yemeklerini tatmak isteyenlere.' }),
  venue('A2', 'Teras Lokantası', at(base[0] + 240, base[1] - 80), { hours: every(['19:00', '23:00']), bookingUrl: 'https://example.com/ornek/rezervasyon', website: 'https://example.com/ornek/teras', images: [IMG_TERRACE], michelin: { distinction: '1-star', greenStar: true, year: 2026, url: 'https://example.com/ornek/michelin-teras' }, whatToEat: ['ÖRNEK ızgara balık', 'ÖRNEK limonlu tatlı'], priceLevel: 3, reservation: 'required', suitsWhom: 'Manzaralı ve sakin bir akşam isteyenlere.' }),
  venue('A3', 'Köşe Dürümcüsü', at(base[0] - 60, base[1] + 200), { hours: every(['17:00', '26:00']), whatToEat: ['ÖRNEK sıcak dürüm', 'ÖRNEK ayran'], priceLevel: 1, suitsWhom: 'Yorgun, hızlı ve ekonomik yemek isteyenlere; gece 02:00’ye kadar açık.' }),
];

const day1 = {
  date: '2027-05-14',
  title: 'Meydan ve kule',
  theme: 'Kentin kalbi: pazar meydanından manastır bahçesine',
  area: 'ÖRNEK Eski Kent',
  timeline: [
    { time: '08:30 civarı', title: 'Kahvaltı', kind: 'breakfast', stopOrder: null, venueCodes: ['K1', 'K2', 'K3'], fixed: false, note: null },
    { time: '09:30', title: 'Pazar Meydanı', kind: 'stop', stopOrder: 1, venueCodes: [], fixed: false, note: null },
    { time: '10:30–11:00', title: 'Saat Kulesi', kind: 'stop', stopOrder: 2, venueCodes: [], fixed: true, note: 'Kuleye çıkış biletli ve saatlidir.' },
    { time: '11:30 civarı', title: 'Kent Müzesi', kind: 'stop', stopOrder: 3, venueCodes: [], fixed: false, note: null },
    { time: '13:00 civarı', title: 'Öğle yemeği', kind: 'lunch', stopOrder: null, venueCodes: ['O1', 'O2'], fixed: false, note: null },
    { time: '14:30–15:30', title: 'Dinlenme ve serbest dolaşma', kind: 'free', stopOrder: null, venueCodes: [], fixed: false, note: null },
    { time: '15:30 civarı', title: 'Çeşme Sokağı', kind: 'stop', stopOrder: 4, venueCodes: [], fixed: false, note: null },
    { time: '16:00 civarı', title: 'Dondurma molası', kind: 'snack', stopOrder: null, venueCodes: ['S1'], fixed: false, note: null },
    { time: '16:30 civarı', title: 'Manastır Bahçesi', kind: 'stop', stopOrder: 5, venueCodes: [], fixed: false, note: null },
    { time: '19:30 civarı', title: 'Akşam yemeği', kind: 'dinner', stopOrder: null, venueCodes: ['A1', 'A2', 'A3'], fixed: false, note: null },
  ],
  stops: day1Stops,
  breakfast: breakfasts([0, 0]),
  lunch: {
    main: venue('O1', 'Esnaf Lokantası', at(620, 40), { whatToEat: ['ÖRNEK günün tenceresi', 'ÖRNEK pilav'], priceLevel: 1, suitsWhom: 'Yerlilerle birlikte hızlı öğle yemeği isteyenlere.' }),
    backup: venue('O2', 'Bahçe Kafe', at(700, -200), { whatToEat: ['ÖRNEK sebzeli tart', 'ÖRNEK limonata'], priceLevel: 2, suitsWhom: 'Gölgede oturup dinlenmek isteyenlere.' }),
  },
  dinner: dinners([300, 100]),
  snacks: [venue('S1', 'Köprü Dondurmacısı', at(900, 200), { whatToEat: ['ÖRNEK fıstıklı dondurma', 'ÖRNEK limonlu dondurma'], priceLevel: 1, suitsWhom: 'Öğleden sonra serinlemek isteyenlere.' })],
  flex: {
    swappable: 'Müze ile Saat Kulesi yer değiştirebilir; kule bileti saatlidir, ona göre ayarlayın.',
    skipIfTired: 'Çeşme Sokağı atlanabilir.',
    ifExtraTime: 'Manastır Bahçesi’nden sonra köprüye kadar yürüyün.',
    ifRain: 'Bahçe yerine müzede daha uzun kalın.',
  },
  notes: null,
  fromLodging: { mode: 'walk', minutes: 6, instruction: 'ÖRNEK: otelden çıkıp sola dönün, revakların altından meydana yürüyün.' },
  toLodging: { mode: 'walk', minutes: 15, instruction: 'ÖRNEK: bahçe kapısından çıkıp dere boyunca güneye yürüyün; köprüyü geçince otel sağda.' },
  eveningEvents: [
    { title: 'ÖRNEK Avlu Konseri', kind: 'concert', venueName: 'ÖRNEK Müze Avlusu', address: 'ÖRNEK Müze Sokağı, ÖRNEK Kent', ...at(580, -100), coordSource: 'other', date: '2027-05-14', startTime: '21:00', endTime: '22:30', priceText: 'ÖRNEK 15 Avro', bookingUrl: 'https://example.com/ornek/konser', website: null, note: 'Bu etkinlik örnektir; gerçek değildir.', suitsWhom: 'Akşam yemeğinden sonra sakin bir müzik isteyenlere.', sources: src('etkinlik-konser'), verifiedAt: V },
    { title: 'ÖRNEK Fener Yürüyüşü', kind: 'tour', venueName: 'ÖRNEK Saat Kulesi önü', address: null, ...at(330, 190), coordSource: 'other', date: '2027-05-14', startTime: '22:00', endTime: null, priceText: 'Ücretsiz', bookingUrl: null, website: 'https://example.com/ornek/fener', note: 'Bu etkinlik örnektir; gerçek değildir.', suitsWhom: 'Gece yürümeyi sevenlere.', sources: src('etkinlik-fener'), verifiedAt: V },
  ],
};

const day2 = {
  date: '2027-05-15',
  title: 'Köprüden tepeye',
  theme: 'Dere kıyısı, kapalı pazar ve gün batımı',
  area: 'ÖRNEK Dere Kıyısı',
  timeline: [
    { time: '08:30 civarı', title: 'Kahvaltı', kind: 'breakfast', stopOrder: null, venueCodes: ['K1', 'K2', 'K3'], fixed: false, note: null },
    { time: '09:30', title: 'Eski Köprü', kind: 'stop', stopOrder: 1, venueCodes: [], fixed: false, note: null },
    { time: '10:30 civarı', title: 'Kapalı Pazar', kind: 'stop', stopOrder: 2, venueCodes: [], fixed: false, note: null },
    { time: '11:30 civarı', title: 'Gizli Avlu', kind: 'stop', stopOrder: 3, venueCodes: [], fixed: false, note: null },
    { time: '13:00 civarı', title: 'Öğle yemeği', kind: 'lunch', stopOrder: null, venueCodes: ['O1', 'O2'], fixed: false, note: null },
    { time: '14:30–16:30', title: 'Dinlenme', kind: 'free', stopOrder: null, venueCodes: [], fixed: false, note: null },
    { time: '17:00 civarı', title: 'Sur Kapısı', kind: 'stop', stopOrder: 4, venueCodes: [], fixed: false, note: null },
    { time: '19:40', title: 'Tepe Terası, gün batımı', kind: 'stop', stopOrder: 5, venueCodes: [], fixed: true, note: 'Gün batımı ÖRNEK saat 20:30.' },
    { time: '21:00 civarı', title: 'Akşam yemeği', kind: 'dinner', stopOrder: null, venueCodes: ['A1', 'A2', 'A3'], fixed: false, note: null },
  ],
  stops: day2Stops,
  breakfast: breakfasts([-250, -300]),
  lunch: {
    main: venue('O1', 'Balıkçı Tezgahı', at(-560, 80), { whatToEat: ['ÖRNEK kızarmış hamsi', 'ÖRNEK balık çorbası'], priceLevel: 2, closedWeekdays: ['mon'], closedDays: 'Pazartesi', suitsWhom: 'Pazarın içinde taze balık isteyenlere.' }),
    backup: venue('O2', 'Pazar Börekçisi', at(-480, -60), { whatToEat: ['ÖRNEK peynirli börek', 'ÖRNEK çay'], priceLevel: 1, suitsWhom: 'Ayakta, hızlı bir şey isteyenlere.' }),
  },
  dinner: dinners([-1700, 1300]),
  snacks: [venue('S1', 'Pazar Kahvecisi', at(-540, 0), { whatToEat: ['ÖRNEK sert kahve', 'ÖRNEK bademli kurabiye'], priceLevel: 1, suitsWhom: 'Ayakta kısa bir kahve molası isteyenlere.' })],
  flex: {
    swappable: 'Kapalı Pazar ile Eski Köprü yer değiştirebilir.',
    skipIfTired: 'Gizli Avlu atlanabilir.',
    ifExtraTime: 'Surun üstünde bir kule daha yürüyün.',
    ifRain: 'Kapalı Pazar’da daha uzun kalın; teras yerine pazar kahvecisinde oturun.',
  },
  notes: null,
  fromLodging: { mode: 'walk', minutes: 8, instruction: 'ÖRNEK: otelin önünden dere boyunca kuzeye yürüyün; köprü karşınıza çıkar.' },
  toLodging: { mode: 'drive', minutes: 12, instruction: 'ÖRNEK: terastan taksiyle otele dönün.' },
  eveningEvents: [
    { title: 'ÖRNEK Gece Pazarı', kind: 'market', venueName: 'ÖRNEK Kapalı Pazar', address: 'ÖRNEK Pazar Caddesi, ÖRNEK Kent', ...at(-520, 30), coordSource: 'other', date: '2027-05-15', startTime: '21:30', endTime: '23:30', priceText: 'Ücretsiz', bookingUrl: null, website: null, note: 'Bu etkinlik örnektir; gerçek değildir.', suitsWhom: 'Gece atıştırmak isteyenlere.', sources: src('etkinlik-pazar'), verifiedAt: V },
  ],
};

const phrases = [
  ['Buongiorno', 'Bon curno', 'Günaydın / iyi günler', 'Öğleye kadar selamlaşırken'],
  ['Buonasera', 'Bonasera', 'İyi akşamlar', 'Öğleden sonra ve akşam'],
  ['Grazie', 'Gratsiye', 'Teşekkürler', null],
  ['Per favore', 'Per favore', 'Lütfen', null],
  ['Scusi', 'Skuzi', 'Affedersiniz', 'Birine seslenirken'],
  ['Arrivederci', 'Arrivederçi', 'Hoşça kalın', 'Ayrılırken'],
  ['Sì / No', 'Si / No', 'Evet / Hayır', null],
  ['Quanto costa?', 'Kuanto kosta?', 'Ne kadar?', 'Alışverişte'],
  ['Il conto, per favore', 'İl konto per favore', 'Hesap lütfen', 'Masada'],
  ['Vorrei questo', 'Vorrey kuesto', 'Bunu istiyorum', 'Sipariş verirken gösterip'],
  ['Un altro, per favore', 'Un altro per favore', 'Bir tane daha, lütfen', 'Sipariş verirken'],
  ['È buonissimo!', 'E buonissimo!', 'Çok lezzetli!', 'Yemekten sonra'],
  ['Non piccante, per favore', 'Non pikkante per favore', 'Acısız olsun, lütfen', 'Sipariş verirken'],
  ['Un tavolo per due', 'Un tavolo per due', 'İki kişilik bir masa', 'Lokantaya girince'],
  ['Acqua naturale', 'Akkua naturale', 'Sade su', 'Su isterken'],
  ['Dov’è il bagno?', 'Dove il banyo?', 'Tuvalet nerede?', null],
  ['Parla inglese?', 'Parla inglese?', 'İngilizce konuşuyor musunuz?', null],
  ['Senza carne di maiale, per favore', 'Senza karne di mayale, per favore', 'Domuz eti olmasın, lütfen', 'Sipariş verirken; yeme içme kısıtı'],
].map(([original, pronunciationTr, meaning, context]) => ({ original, script: null, pronunciationTr, meaning, context }));

const plan = {
  schemaVersion: 2,
  id: 'ornek-gezi',
  title: 'ÖRNEK Gezi: İki Günde ÖRNEK Kent',
  destinations: ['ÖRNEK Kent'],
  startDate: '2027-05-14',
  endDate: '2027-05-15',
  summary: 'Uygulamayı tanımak için hazırlanmış, uydurma mekanlardan oluşan iki günlük örnek gezi.',
  assumptions: [
    'Bu gezi örnektir: bütün mekan ve durak adları uydurmadır, gerçek bir yeri göstermez.',
    'Koordinatlar bir merkez noktanın çevresine yapay olarak yerleştirildi.',
    'Yürüyerek gezilir; ikinci gün tepeye araçla çıkılır.',
    'ÖRNEK yeme içme kısıtı: domuz eti yenmiyor.',
    'Uçuş, otel, Michelin derecesi ve etkinlikler örnektir; bağlantılar example.com adresine gider.',
  ],
  weatherNote: 'ÖRNEK: mayıs ortası ılık; gündüz 22 °C civarı. Gün doğumu 05:40, gün batımı 20:30 civarı.',
  reservations: [
    { what: 'ÖRNEK Saat Kulesi çıkışı', when: '1. gün 10:30', note: 'Saatli bilet; bir gün önceden alın.', url: 'https://example.com/ornek/bilet' },
    { what: 'ÖRNEK Teras Lokantası (A2)', when: '1. ve 2. gün akşam', note: 'Rezervasyon gerekli.', url: null },
  ],
  cuisine: [
    { name: 'ÖRNEK yöre makarnası', description: 'El açması, kalın şerit makarna; tereyağı ve adaçayıyla.', where: 'A1 Usta Lokantası' },
    { name: 'ÖRNEK kızarmış hamsi', description: 'Mısır ununa bulanıp kızartılan küçük balık.', where: '2. gün O1 Balıkçı Tezgahı' },
    { name: 'ÖRNEK fıstıklı dondurma', description: 'Kentin yaz klasiği.', where: '1. gün S1 Köprü Dondurmacısı' },
  ],
  days: [day1, day2],
  phrases: [{ language: 'İtalyanca', langCode: 'it-IT', items: phrases }],
  practical: {
    transport: 'ÖRNEK: eski kent yürüyerek gezilir. Tepeye taksiyle 10 dakika.',
    moneyAndTipping: 'ÖRNEK: kart çoğu yerde geçer; pazarda nakit gerekir. Bahşiş zorunlu değil, %5-10 yaygın.',
    closedDays: 'ÖRNEK: müzeler pazartesi, kapalı pazar pazar günü kapalı.',
    emergency: [
      { label: 'Genel acil (Avrupa)', number: '112' },
      { label: 'ÖRNEK turizm polisi', number: '000 000 00 00' },
    ],
    notes: ['Bu bilgiler örnektir; gerçek bir gezide planı Claude’da üretin.'],
  },
  sources: [
    { title: 'ÖRNEK genel kaynak', url: 'https://example.com/ornek' },
  ],
  verifiedAt: V,
  notes: 'ÖRNEK veri. Gerçek mekan değildir.',
  lodging: {
    name: 'ÖRNEK Dere Oteli',
    address: 'ÖRNEK Dere Caddesi No: 7, ÖRNEK Kent',
    ...at(-150, 250),
    coordSource: 'other',
    phone: FAKE_PHONE,
    website: 'https://example.com/ornek/otel',
    checkIn: '14:00',
    checkOut: '11:00',
    note: 'ÖRNEK konaklama; gerçek bir otel değildir.',
  },
  arrival: {
    title: 'ÖRNEK Havalimanından otele',
    date: '2027-05-14',
    flight: 'ÖRNEK uçuş XX 0000',
    flightTime: '06:40',
    hubName: 'ÖRNEK Havalimanı, gelen yolcu çıkışı',
    hubLat: at(-6000, -4000).lat,
    hubLng: at(-6000, -4000).lng,
    leaveBy: null,
    steps: [
      { mode: 'walk', instruction: 'Bagajı alıp “Tren” tabelasını izleyin; istasyon terminalin altında.', from: 'Gelen yolcu çıkışı', to: 'Havalimanı istasyonu', line: null, direction: null, stopsCount: null, durationMinutes: 5, ticket: null, costText: null, ...at(-6000, -4000) },
      { mode: 'train', instruction: 'ÖRNEK hafif raylıya binin, “Merkez” yönünde gidin; “Dere Köprüsü” durağında inin.', from: 'Havalimanı istasyonu', to: 'Dere Köprüsü', line: 'ÖRNEK H1', direction: 'Merkez', stopsCount: 6, durationMinutes: 22, ticket: 'Tek yön bilet, istasyondaki makineden; kartla ödenir.', costText: 'ÖRNEK 4 Avro', lat: null, lng: null },
      { mode: 'walk', instruction: 'Duraktan çıkınca köprüyü geçin; otel dere caddesinin sağ tarafında.', from: 'Dere Köprüsü', to: 'ÖRNEK Dere Oteli', line: null, direction: null, stopsCount: null, durationMinutes: 6, ticket: null, costText: null, ...at(-300, -250) },
    ],
    totalMinutes: 33,
    costText: 'ÖRNEK 4 Avro',
    alternatives: [
      { title: 'Taksi', summary: 'ÖRNEK: çıkıştaki resmi taksi durağından.', minutes: 20, costText: 'ÖRNEK 35 Avro' },
      { title: 'Servis otobüsü', summary: 'ÖRNEK: yarım saatte bir, merkez garına.', minutes: 35, costText: 'ÖRNEK 6 Avro' },
    ],
    note: 'Bu yol tarifi örnektir.',
    sources: src('varis'),
    verifiedAt: V,
  },
  departure: {
    title: 'ÖRNEK Otelden havalimanına',
    date: '2027-05-15',
    flight: 'ÖRNEK uçuş XX 0001',
    flightTime: '23:59',
    hubName: 'ÖRNEK Havalimanı, giden yolcu',
    hubLat: at(-6000, -4000).lat,
    hubLng: at(-6000, -4000).lng,
    leaveBy: '21:00',
    steps: [
      { mode: 'walk', instruction: 'Otelden çıkıp köprüyü geçin; “Dere Köprüsü” durağına yürüyün.', from: 'ÖRNEK Dere Oteli', to: 'Dere Köprüsü', line: null, direction: null, stopsCount: null, durationMinutes: 6, ticket: null, costText: null, lat: null, lng: null },
      { mode: 'train', instruction: 'ÖRNEK hafif raylıya “Havalimanı” yönünde binin; son durakta inin.', from: 'Dere Köprüsü', to: 'Havalimanı istasyonu', line: 'ÖRNEK H1', direction: 'Havalimanı', stopsCount: 6, durationMinutes: 22, ticket: 'Tek yön bilet, makineden.', costText: 'ÖRNEK 4 Avro', lat: null, lng: null },
      { mode: 'walk', instruction: 'İstasyondan yürüyen merdivenle giden yolcu katına çıkın.', from: 'Havalimanı istasyonu', to: 'Giden yolcu', line: null, direction: null, stopsCount: null, durationMinutes: 5, ticket: null, costText: null, lat: null, lng: null },
    ],
    totalMinutes: 33,
    costText: 'ÖRNEK 4 Avro',
    alternatives: [{ title: 'Taksi', summary: 'ÖRNEK: otel resepsiyonundan çağrılır.', minutes: 20, costText: 'ÖRNEK 35 Avro' }],
    note: 'Bu yol tarifi örnektir.',
    sources: src('donus'),
    verifiedAt: V,
  },
};

mkdirSync('src/sample', { recursive: true });
writeFileSync('src/sample/ornek-plan.json', JSON.stringify(plan, null, 2) + '\n', 'utf8');
console.log('src/sample/ornek-plan.json yazıldı');
