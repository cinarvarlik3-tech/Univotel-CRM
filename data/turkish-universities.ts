/**
 * Turkish university dictionary for old-leads import message parsing.
 * Canonical names are stored in old_lead_details.university.
 */
import type { UniversityEntry } from '@/lib/import/extract-university';

export const TURKISH_UNIVERSITIES: UniversityEntry[] = [
  {
    canonical: 'Boğaziçi Üniversitesi',
    aliases: ['bogazici universitesi', 'bogazici uni', 'bogazici', 'boun', 'bogazici u'],
  },
  {
    canonical: 'İstanbul Teknik Üniversitesi',
    aliases: [
      'istanbul teknik universitesi',
      'istanbul teknik',
      'itu',
      'i.t.u',
      'teknik universite',
    ],
  },
  {
    canonical: 'İstanbul Üniversitesi',
    aliases: ['istanbul universitesi', 'istanbul uni', 'istanbul u', 'iu'],
  },
  {
    canonical: 'Marmara Üniversitesi',
    aliases: ['marmara universitesi', 'marmara uni', 'marmara'],
  },
  {
    canonical: 'Yıldız Teknik Üniversitesi',
    aliases: ['yildiz teknik universitesi', 'yildiz teknik', 'ytu', 'yildiz'],
  },
  {
    canonical: 'Galatasaray Üniversitesi',
    aliases: ['galatasaray universitesi', 'galatasaray uni', 'gsu', 'galatasaray'],
  },
  {
    canonical: 'Mimar Sinan Güzel Sanatlar Üniversitesi',
    aliases: ['mimar sinan', 'msgsu', 'guzel sanatlar universitesi'],
  },
  {
    canonical: 'İstanbul Medipol Üniversitesi',
    aliases: ['medipol universitesi', 'medipol uni', 'medipol'],
  },
  {
    canonical: 'Bahçeşehir Üniversitesi',
    aliases: ['bahcesehir universitesi', 'bahcesehir uni', 'bau', 'bahcesehir'],
  },
  {
    canonical: 'İstanbul Bilgi Üniversitesi',
    aliases: ['bilgi universitesi', 'bilgi uni', 'bilgi'],
  },
  {
    canonical: 'Koç Üniversitesi',
    aliases: ['koc universitesi', 'koc uni', 'koc'],
  },
  {
    canonical: 'Sabancı Üniversitesi',
    aliases: ['sabanci universitesi', 'sabanci uni', 'sabanci'],
  },
  {
    canonical: 'Özyeğin Üniversitesi',
    aliases: ['ozyegin universitesi', 'ozyegin uni', 'ozyegin'],
  },
  {
    canonical: 'İstanbul Aydın Üniversitesi',
    aliases: ['istanbul aydin universitesi', 'aydin universitesi', 'iau', 'aydin uni'],
  },
  {
    canonical: 'İstanbul Kültür Üniversitesi',
    aliases: ['kultur universitesi', 'istanbul kultur', 'kultur uni'],
  },
  {
    canonical: 'İstanbul Ticaret Üniversitesi',
    aliases: ['ticaret universitesi', 'istanbul ticaret', 'ticaret uni'],
  },
  {
    canonical: 'İstanbul Gelişim Üniversitesi',
    aliases: ['gelisim universitesi', 'gelisim uni', 'gelisim'],
  },
  {
    canonical: 'İstanbul Okan Üniversitesi',
    aliases: ['okan universitesi', 'okan uni', 'okan'],
  },
  {
    canonical: 'İstanbul Nişantaşı Üniversitesi',
    aliases: ['nisantasi universitesi', 'nisantasi uni', 'nisantasi'],
  },
  {
    canonical: 'İstanbul Kent Üniversitesi',
    aliases: ['kent universitesi', 'kent uni', 'istanbul kent'],
  },
  {
    canonical: 'İstanbul 29 Mayıs Üniversitesi',
    aliases: ['29 mayis universitesi', '29 mayis uni'],
  },
  {
    canonical: 'İstanbul Arel Üniversitesi',
    aliases: ['arel universitesi', 'arel uni', 'arel'],
  },
  {
    canonical: 'İstanbul Beykent Üniversitesi',
    aliases: ['beykent universitesi', 'beykent uni', 'beykent'],
  },
  {
    canonical: 'İstanbul Esenyurt Üniversitesi',
    aliases: ['esenyurt universitesi', 'esenyurt uni'],
  },
  {
    canonical: 'İstanbul Gedik Üniversitesi',
    aliases: ['gedik universitesi', 'gedik uni'],
  },
  {
    canonical: 'İstanbul Rumeli Üniversitesi',
    aliases: ['rumeli universitesi', 'rumeli uni'],
  },
  {
    canonical: 'İstanbul Sağlık ve Teknoloji Üniversitesi',
    aliases: ['istun', 'saglik ve teknoloji universitesi'],
  },
  {
    canonical: 'İstanbul Topkapı Üniversitesi',
    aliases: ['topkapi universitesi', 'topkapi uni'],
  },
  {
    canonical: 'İstanbul Yeni Yüzyıl Üniversitesi',
    aliases: ['yeni yuzyil universitesi', 'yeni yuzyil uni'],
  },
  {
    canonical: 'Altınbaş Üniversitesi',
    aliases: ['altinbas universitesi', 'altinbas uni', 'altinbas'],
  },
  {
    canonical: 'Acıbadem Mehmet Ali Aydınlar Üniversitesi',
    aliases: ['acibadem universitesi', 'acibadem uni', 'acibadem'],
  },
  {
    canonical: 'Bezmialem Vakıf Üniversitesi',
    aliases: ['bezmialem universitesi', 'bezmialem uni', 'bezmialem'],
  },
  {
    canonical: 'Fatih Sultan Mehmet Vakıf Üniversitesi',
    aliases: ['fsmvu', 'fatih sultan mehmet universitesi', 'fatih sultan mehmet'],
  },
  {
    canonical: 'Fenerbahçe Üniversitesi',
    aliases: ['fenerbahce universitesi', 'fenerbahce uni'],
  },
  {
    canonical: 'Haliç Üniversitesi',
    aliases: ['halic universitesi', 'halic uni', 'halic'],
  },
  {
    canonical: 'İstinye Üniversitesi',
    aliases: ['istinye universitesi', 'istinye uni', 'istinye'],
  },
  {
    canonical: 'Kadir Has Üniversitesi',
    aliases: ['kadir has universitesi', 'kadir has uni', 'kadir has'],
  },
  {
    canonical: 'Maltepe Üniversitesi',
    aliases: ['maltepe universitesi', 'maltepe uni', 'maltepe'],
  },
  {
    canonical: 'Nişantaşı Üniversitesi',
    aliases: ['nisantasi universitesi', 'nisantasi'],
  },
  {
    canonical: 'Piri Reis Üniversitesi',
    aliases: ['piri reis universitesi', 'piri reis uni'],
  },
  {
    canonical: 'Türk-Alman Üniversitesi',
    aliases: ['turk alman universitesi', 'tau', 'turk alman'],
  },
  {
    canonical: 'Türk Hava Kurumu Üniversitesi',
    aliases: ['thk universitesi', 'turk hava kurumu'],
  },
  {
    canonical: 'Üsküdar Üniversitesi',
    aliases: ['uskudar universitesi', 'uskudar uni', 'uskudar'],
  },
  {
    canonical: 'Yeditepe Üniversitesi',
    aliases: ['yeditepe universitesi', 'yeditepe uni', 'yeditepe'],
  },
  {
    canonical: 'Ankara Üniversitesi',
    aliases: ['ankara universitesi', 'ankara uni'],
  },
  {
    canonical: 'Hacettepe Üniversitesi',
    aliases: ['hacettepe universitesi', 'hacettepe uni', 'hacettepe'],
  },
  {
    canonical: 'Gazi Üniversitesi',
    aliases: ['gazi universitesi', 'gazi uni', 'gazi'],
  },
  {
    canonical: 'Orta Doğu Teknik Üniversitesi',
    aliases: ['odtu', 'orta dogu teknik', 'odtu universitesi', 'metu'],
  },
  {
    canonical: 'Bilkent Üniversitesi',
    aliases: ['bilkent universitesi', 'bilkent uni', 'bilkent'],
  },
  {
    canonical: 'Başkent Üniversitesi',
    aliases: ['baskent universitesi', 'baskent uni', 'baskent'],
  },
  {
    canonical: 'TOBB Ekonomi ve Teknoloji Üniversitesi',
    aliases: ['tobb etu', 'tobb universitesi', 'tobb'],
  },
  {
    canonical: 'Çankaya Üniversitesi',
    aliases: ['cankaya universitesi', 'cankaya uni', 'cankaya'],
  },
  {
    canonical: 'Atılım Üniversitesi',
    aliases: ['atilim universitesi', 'atilim uni', 'atilim'],
  },
  {
    canonical: 'Ege Üniversitesi',
    aliases: ['ege universitesi', 'ege uni', 'ege'],
  },
  {
    canonical: 'Dokuz Eylül Üniversitesi',
    aliases: ['dokuz eylul universitesi', 'dokuz eylul', 'deu'],
  },
  {
    canonical: 'Yaşar Üniversitesi',
    aliases: ['yasar universitesi', 'yasar uni', 'yasar'],
  },
  {
    canonical: 'İzmir Ekonomi Üniversitesi',
    aliases: ['izmir ekonomi universitesi', 'ieu', 'izmir ekonomi'],
  },
  {
    canonical: 'İzmir Yüksek Teknoloji Enstitüsü',
    aliases: ['iyte', 'izmir yuksek teknoloji'],
  },
  {
    canonical: 'Erciyes Üniversitesi',
    aliases: ['erciyes universitesi', 'erciyes uni', 'erciyes'],
  },
  {
    canonical: 'Selçuk Üniversitesi',
    aliases: ['selcuk universitesi', 'selcuk uni', 'selcuk'],
  },
  {
    canonical: 'Necmettin Erbakan Üniversitesi',
    aliases: ['necmettin erbakan universitesi', 'erbakan universitesi'],
  },
  {
    canonical: 'Karadeniz Teknik Üniversitesi',
    aliases: ['ktu', 'karadeniz teknik universitesi', 'karadeniz teknik'],
  },
  {
    canonical: 'Uludağ Üniversitesi',
    aliases: ['uludag universitesi', 'uludag uni', 'uludag'],
  },
  {
    canonical: 'Bursa Uludağ Üniversitesi',
    aliases: ['bursa uludag universitesi'],
  },
  {
    canonical: 'Akdeniz Üniversitesi',
    aliases: ['akdeniz universitesi', 'akdeniz uni', 'akdeniz'],
  },
  {
    canonical: 'Çukurova Üniversitesi',
    aliases: ['cukurova universitesi', 'cukurova uni', 'cukurova'],
  },
  {
    canonical: 'Gaziantep Üniversitesi',
    aliases: ['gaziantep universitesi', 'gaziantep uni'],
  },
  {
    canonical: 'Sakarya Üniversitesi',
    aliases: ['sakarya universitesi', 'sakarya uni', 'sakarya'],
  },
  {
    canonical: 'Kocaeli Üniversitesi',
    aliases: ['kocaeli universitesi', 'kocaeli uni', 'kocaeli'],
  },
  {
    canonical: 'Gebze Teknik Üniversitesi',
    aliases: ['gtu', 'gebze teknik universitesi', 'gebze teknik'],
  },
  {
    canonical: 'Trakya Üniversitesi',
    aliases: ['trakya universitesi', 'trakya uni', 'trakya'],
  },
  {
    canonical: 'Ondokuz Mayıs Üniversitesi',
    aliases: ['ondokuz mayis universitesi', 'omu'],
  },
  {
    canonical: 'Atatürk Üniversitesi',
    aliases: ['ataturk universitesi', 'ataturk uni', 'ataturk'],
  },
  {
    canonical: 'Fırat Üniversitesi',
    aliases: ['firat universitesi', 'firat uni', 'firat'],
  },
  {
    canonical: 'Dicle Üniversitesi',
    aliases: ['dicle universitesi', 'dicle uni', 'dicle'],
  },
  {
    canonical: 'Pamukkale Üniversitesi',
    aliases: ['pamukkale universitesi', 'pamukkale uni', 'pamukkale'],
  },
  {
    canonical: 'Muğla Sıtkı Koçman Üniversitesi',
    aliases: ['mugla universitesi', 'mugla sitki kocman', 'mskü'],
  },
  {
    canonical: 'Abant İzzet Baysal Üniversitesi',
    aliases: ['abant izzet baysal', 'aibu', 'bolu universitesi'],
  },
  {
    canonical: 'Anadolu Üniversitesi',
    aliases: ['anadolu universitesi', 'anadolu uni', 'anadolu'],
  },
  {
    canonical: 'Eskişehir Teknik Üniversitesi',
    aliases: ['eskisehir teknik universitesi', 'estu'],
  },
  {
    canonical: 'Eskişehir Osmangazi Üniversitesi',
    aliases: ['osmangazi universitesi', 'eskisehir osmangazi'],
  },
  {
    canonical: 'Hitit Üniversitesi',
    aliases: ['hitit universitesi', 'hitit uni', 'corum universitesi'],
  },
  {
    canonical: 'Recep Tayyip Erdoğan Üniversitesi',
    aliases: ['rte universitesi', 'recep tayyip erdogan universitesi', 'rize universitesi'],
  },
  {
    canonical: 'Bandırma Onyedi Eylül Üniversitesi',
    aliases: ['bandirma universitesi', 'bandirma onyedi eylul'],
  },
  {
    canonical: 'Tekirdağ Namık Kemal Üniversitesi',
    aliases: ['namik kemal universitesi', 'tekirdag universitesi', 'nku'],
  },
  {
    canonical: 'Yalova Üniversitesi',
    aliases: ['yalova universitesi', 'yalova uni'],
  },
  {
    canonical: 'Kırklareli Üniversitesi',
    aliases: ['kirklareli universitesi', 'kirklareli uni'],
  },
  {
    canonical: 'Düzce Üniversitesi',
    aliases: ['duzce universitesi', 'duzce uni'],
  },
  {
    canonical: 'Bolu Abant İzzet Baysal Üniversitesi',
    aliases: ['bolu universitesi'],
  },
  {
    canonical: 'Zonguldak Bülent Ecevit Üniversitesi',
    aliases: ['bulent ecevit universitesi', 'zonguldak universitesi', 'zbeu'],
  },
  {
    canonical: 'Karabük Üniversitesi',
    aliases: ['karabuk universitesi', 'karabuk uni'],
  },
  {
    canonical: 'Kastamonu Üniversitesi',
    aliases: ['kastamonu universitesi', 'kastamonu uni'],
  },
  {
    canonical: 'Sinop Üniversitesi',
    aliases: ['sinop universitesi', 'sinop uni'],
  },
  {
    canonical: 'Samsun Üniversitesi',
    aliases: ['samsun universitesi', 'samsun uni'],
  },
  {
    canonical: 'Ondokuz Mayıs Üniversitesi',
    aliases: ['samsun omu'],
  },
  {
    canonical: 'Ordu Üniversitesi',
    aliases: ['ordu universitesi', 'ordu uni'],
  },
  {
    canonical: 'Giresun Üniversitesi',
    aliases: ['giresun universitesi', 'giresun uni'],
  },
  {
    canonical: 'Çanakkale Onsekiz Mart Üniversitesi',
    aliases: ['comu', 'canakkale universitesi', 'canakkale onsekiz mart'],
  },
  {
    canonical: 'Balıkesir Üniversitesi',
    aliases: ['balikesir universitesi', 'balikesir uni'],
  },
  {
    canonical: 'Manisa Celal Bayar Üniversitesi',
    aliases: ['celal bayar universitesi', 'manisa universitesi', 'mcbu'],
  },
  {
    canonical: 'Afyon Kocatepe Üniversitesi',
    aliases: ['afyon universitesi', 'kocatepe universitesi', 'aku'],
  },
  {
    canonical: 'Kütahya Dumlupınar Üniversitesi',
    aliases: ['kutahya universitesi', 'dumlupinar universitesi', 'dpü'],
  },
  {
    canonical: 'Uşak Üniversitesi',
    aliases: ['usak universitesi', 'usak uni'],
  },
  {
    canonical: 'Aydın Adnan Menderes Üniversitesi',
    aliases: ['adnan menderes universitesi', 'adu', 'aydin universitesi'],
  },
  {
    canonical: 'Denizli Pamukkale Üniversitesi',
    aliases: ['denizli universitesi'],
  },
  {
    canonical: 'Isparta Uygulamalı Bilimler Üniversitesi',
    aliases: ['isparta universitesi', 'isbü'],
  },
  {
    canonical: 'Süleyman Demirel Üniversitesi',
    aliases: ['suleyman demirel universitesi', 'sdu', 'isparta sdu'],
  },
  {
    canonical: 'Burdur Mehmet Akif Ersoy Üniversitesi',
    aliases: ['mehmet akif ersoy universitesi', 'burdur universitesi'],
  },
  {
    canonical: 'Antalya Bilim Üniversitesi',
    aliases: ['antalya bilim universitesi'],
  },
  {
    canonical: 'Alanya Alaaddin Keykubat Üniversitesi',
    aliases: ['alanya universitesi', 'alaaddin keykubat'],
  },
  {
    canonical: 'Mersin Üniversitesi',
    aliases: ['mersin universitesi', 'mersin uni'],
  },
  {
    canonical: 'Tarsus Üniversitesi',
    aliases: ['tarsus universitesi', 'tarsus uni'],
  },
  {
    canonical: 'Adana Alparslan Türkeş Bilim ve Teknoloji Üniversitesi',
    aliases: ['adana bilim ve teknoloji', 'turkes bilim teknoloji'],
  },
  {
    canonical: 'Çağ Üniversitesi',
    aliases: ['cag universitesi', 'cag uni'],
  },
  {
    canonical: 'Hasan Kalyoncu Üniversitesi',
    aliases: ['hasan kalyoncu universitesi', 'kalyoncu universitesi'],
  },
  {
    canonical: 'Konya Teknik Üniversitesi',
    aliases: ['konya teknik universitesi'],
  },
  {
    canonical: 'Karamanoğlu Mehmetbey Üniversitesi',
    aliases: ['karamanoglu mehmetbey universitesi', 'karaman universitesi'],
  },
  {
    canonical: 'Aksaray Üniversitesi',
    aliases: ['aksaray universitesi', 'aksaray uni'],
  },
  {
    canonical: 'Nevşehir Hacı Bektaş Veli Üniversitesi',
    aliases: ['nevsehir universitesi', 'haci bektas veli'],
  },
  {
    canonical: 'Kayseri Üniversitesi',
    aliases: ['kayseri universitesi', 'kayseri uni'],
  },
  {
    canonical: 'Kapadokya Üniversitesi',
    aliases: ['kapadokya universitesi', 'kapadokya uni'],
  },
  {
    canonical: 'Sivas Cumhuriyet Üniversitesi',
    aliases: ['cumhuriyet universitesi', 'sivas universitesi'],
  },
  {
    canonical: 'Yozgat Bozok Üniversitesi',
    aliases: ['bozok universitesi', 'yozgat universitesi'],
  },
  {
    canonical: 'Tokat Gaziosmanpaşa Üniversitesi',
    aliases: ['gaziosmanpasa universitesi', 'tokat universitesi'],
  },
  {
    canonical: 'Amasya Üniversitesi',
    aliases: ['amasya universitesi', 'amasya uni'],
  },
  {
    canonical: 'Erzurum Atatürk Üniversitesi',
    aliases: ['erzurum ataturk'],
  },
  {
    canonical: 'Erzincan Binali Yıldırım Üniversitesi',
    aliases: ['erzincan universitesi', 'binali yildirim universitesi'],
  },
  {
    canonical: 'Ağrı İbrahim Çeçen Üniversitesi',
    aliases: ['agri universitesi', 'ibrahim ceçen'],
  },
  {
    canonical: 'Kafkas Üniversitesi',
    aliases: ['kafkas universitesi', 'kafkas uni', 'kars universitesi'],
  },
  {
    canonical: 'Ardahan Üniversitesi',
    aliases: ['ardahan universitesi', 'ardahan uni'],
  },
  {
    canonical: 'Artvin Çoruh Üniversitesi',
    aliases: ['artvin universitesi', 'coruh universitesi'],
  },
  {
    canonical: 'Van Yüzüncü Yıl Üniversitesi',
    aliases: ['yuzuncu yil universitesi', 'yyu', 'van universitesi'],
  },
  {
    canonical: 'Muş Alparslan Üniversitesi',
    aliases: ['mus universitesi', 'alparslan universitesi'],
  },
  {
    canonical: 'Bitlis Eren Üniversitesi',
    aliases: ['bitlis universitesi', 'bitlis eren'],
  },
  {
    canonical: 'Siirt Üniversitesi',
    aliases: ['siirt universitesi', 'siirt uni'],
  },
  {
    canonical: 'Şırnak Üniversitesi',
    aliases: ['sirnak universitesi', 'sirnak uni'],
  },
  {
    canonical: 'Hakkari Üniversitesi',
    aliases: ['hakkari universitesi', 'hakkari uni'],
  },
  {
    canonical: 'Batman Üniversitesi',
    aliases: ['batman universitesi', 'batman uni'],
  },
  {
    canonical: 'Mardin Artuklu Üniversitesi',
    aliases: ['artuklu universitesi', 'mardin universitesi'],
  },
  {
    canonical: 'Harran Üniversitesi',
    aliases: ['harran universitesi', 'sanliurfa universitesi'],
  },
  {
    canonical: 'Kilis 7 Aralık Üniversitesi',
    aliases: ['kilis universitesi', 'kilis 7 aralik'],
  },
  {
    canonical: 'Adıyaman Üniversitesi',
    aliases: ['adiyaman universitesi', 'adiyaman uni'],
  },
  {
    canonical: 'Malatya Turgut Özal Üniversitesi',
    aliases: ['turgut ozal universitesi', 'malatya universitesi'],
  },
  {
    canonical: 'Elazığ Fırat Üniversitesi',
    aliases: ['elazig universitesi'],
  },
  {
    canonical: 'Bingöl Üniversitesi',
    aliases: ['bingol universitesi', 'bingol uni'],
  },
  {
    canonical: 'Tunceli Munzur Üniversitesi',
    aliases: ['munzur universitesi', 'tunceli universitesi'],
  },
  {
    canonical: 'İskenderun Teknik Üniversitesi',
    aliases: ['iskenderun teknik universitesi', 'iste'],
  },
  {
    canonical: 'Hatay Mustafa Kemal Üniversitesi',
    aliases: ['mustafa kemal universitesi', 'hatay universitesi', 'mku'],
  },
  {
    canonical: 'Osmaniye Korkut Ata Üniversitesi',
    aliases: ['osmaniye universitesi', 'korkut ata universitesi'],
  },
  {
    canonical: 'Kahramanmaraş Sütçü İmam Üniversitesi',
    aliases: ['ksu', 'sutcu imam universitesi', 'kahramanmaras universitesi'],
  },
  {
    canonical: 'Kahramanmaraş İstiklal Üniversitesi',
    aliases: ['istiklal universitesi', 'maras istiklal'],
  },
  {
    canonical: 'Niğde Ömer Halisdemir Üniversitesi',
    aliases: ['omer halisdemir universitesi', 'nigde universitesi'],
  },
  {
    canonical: 'Kırıkkale Üniversitesi',
    aliases: ['kirikkale universitesi', 'kirikkale uni'],
  },
  {
    canonical: 'Çankırı Karatekin Üniversitesi',
    aliases: ['karatekin universitesi', 'cankiri universitesi'],
  },
  {
    canonical: 'Kırşehir Ahi Evran Üniversitesi',
    aliases: ['ahi evran universitesi', 'kirsehir universitesi'],
  },
  {
    canonical: 'Nevşehir Üniversitesi',
    aliases: ['nevsehir uni'],
  },
  {
    canonical: 'Trabzon Üniversitesi',
    aliases: ['trabzon universitesi'],
  },
  {
    canonical: 'Avrasya Üniversitesi',
    aliases: ['avrasya universitesi', 'avrasya uni', 'trabzon avrasya'],
  },
  {
    canonical: 'İstanbul Sabahattin Zaim Üniversitesi',
    aliases: ['sabahattin zaim universitesi', 'izu', 'zaim universitesi'],
  },
  {
    canonical: 'İstanbul Atlas Üniversitesi',
    aliases: ['atlas universitesi', 'istanbul atlas'],
  },
  {
    canonical: 'İstanbul Galata Üniversitesi',
    aliases: ['galata universitesi', 'istanbul galata'],
  },
  {
    canonical: 'İstanbul Health and Technology University',
    aliases: ['health and technology university'],
  },
  {
    canonical: 'İstanbul Şişli Meslek Yüksekokulu',
    aliases: ['sisli meslek'],
  },
  {
    canonical: 'İstanbul Cerrahpaşa Üniversitesi',
    aliases: ['cerrahpasa universitesi', 'istanbul cerrahpasa'],
  },
  {
    canonical: 'İstanbul Medeniyet Üniversitesi',
    aliases: ['medeniyet universitesi', 'istanbul medeniyet'],
  },
  {
    canonical: 'İstanbul Üniversitesi-Cerrahpaşa',
    aliases: ['iu cerrahpasa'],
  },
  {
    canonical: 'İstanbul Yıldız Teknik Üniversitesi',
    aliases: ['ytu istanbul'],
  },
  {
    canonical: 'İstanbul Commerce University',
    aliases: ['istanbul commerce'],
  },
  {
    canonical: 'İstanbul Kent University',
    aliases: ['kent university'],
  },
  {
    canonical: 'İstanbul Aydin University',
    aliases: ['aydin university'],
  },
  {
    canonical: 'İstanbul Gelişim University',
    aliases: ['gelisim university'],
  },
  {
    canonical: 'İstanbul Okan University',
    aliases: ['okan university'],
  },
  {
    canonical: 'İstanbul Beykent University',
    aliases: ['beykent university'],
  },
  {
    canonical: 'İstanbul Kültür University',
    aliases: ['kultur university'],
  },
  {
    canonical: 'İstanbul Ticaret University',
    aliases: ['ticaret university'],
  },
  {
    canonical: 'İstanbul Medipol University',
    aliases: ['medipol university'],
  },
  {
    canonical: 'İstanbul Bilgi University',
    aliases: ['bilgi university'],
  },
  {
    canonical: 'İstanbul Arel University',
    aliases: ['arel university'],
  },
  {
    canonical: 'İstanbul Esenyurt University',
    aliases: ['esenyurt university'],
  },
  {
    canonical: 'İstanbul Gedik University',
    aliases: ['gedik university'],
  },
  {
    canonical: 'İstanbul Rumeli University',
    aliases: ['rumeli university'],
  },
  {
    canonical: 'İstanbul Topkapi University',
    aliases: ['topkapi university'],
  },
  {
    canonical: 'İstanbul Yeni Yüzyıl University',
    aliases: ['yeni yuzyil university'],
  },
  {
    canonical: 'İstanbul 29 Mayıs University',
    aliases: ['29 mayis university'],
  },
  {
    canonical: 'İstanbul Nişantaşı University',
    aliases: ['nisantasi university'],
  },
  {
    canonical: 'İstanbul Kent Üniversitesi',
    aliases: ['kent university istanbul'],
  },
  {
    canonical: 'İstanbul Şehir Üniversitesi',
    aliases: ['sehir universitesi', 'istanbul sehir'],
  },
  {
    canonical: 'İstanbul Finans Üniversitesi',
    aliases: ['finans universitesi', 'istanbul finans'],
  },
  {
    canonical: 'İstanbul Zaim Üniversitesi',
    aliases: ['zaim uni'],
  },
  {
    canonical: 'İstanbul Atlas University',
    aliases: ['atlas uni'],
  },
  {
    canonical: 'İstanbul Galata University',
    aliases: ['galata uni'],
  },
  {
    canonical: 'İstanbul Health and Technology University',
    aliases: ['istun saglik'],
  },
  {
    canonical: 'İstanbul Commerce University',
    aliases: ['ticaret english'],
  },
  {
    canonical: 'İstanbul Kent University',
    aliases: ['kent english'],
  },
  {
    canonical: 'İstanbul Aydin University',
    aliases: ['aydin english'],
  },
  {
    canonical: 'İstanbul Gelişim University',
    aliases: ['gelisim english'],
  },
  {
    canonical: 'İstanbul Okan University',
    aliases: ['okan english'],
  },
  {
    canonical: 'İstanbul Beykent University',
    aliases: ['beykent english'],
  },
  {
    canonical: 'İstanbul Kültür University',
    aliases: ['kultur english'],
  },
  {
    canonical: 'İstanbul Ticaret University',
    aliases: ['ticaret english uni'],
  },
  {
    canonical: 'İstanbul Medipol University',
    aliases: ['medipol english'],
  },
  {
    canonical: 'İstanbul Bilgi University',
    aliases: ['bilgi english'],
  },
  {
    canonical: 'İstanbul Arel University',
    aliases: ['arel english'],
  },
  {
    canonical: 'İstanbul Esenyurt University',
    aliases: ['esenyurt english'],
  },
  {
    canonical: 'İstanbul Gedik University',
    aliases: ['gedik english'],
  },
  {
    canonical: 'İstanbul Rumeli University',
    aliases: ['rumeli english'],
  },
  {
    canonical: 'İstanbul Topkapi University',
    aliases: ['topkapi english'],
  },
  {
    canonical: 'İstanbul Yeni Yüzyıl University',
    aliases: ['yeni yuzyil english'],
  },
  {
    canonical: 'İstanbul 29 Mayıs University',
    aliases: ['29 mayis english'],
  },
  {
    canonical: 'İstanbul Nişantaşı University',
    aliases: ['nisantasi english'],
  },
];
