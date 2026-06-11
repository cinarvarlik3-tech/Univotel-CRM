/**
 * Canonical university/campus list values from Chatwoot custom attribute "university".
 * uni_name values must match Chatwoot list entries exactly for sync and combobox lookup.
 */

/** Exact Chatwoot list labels — image 1 then image 2, deduplicated. */
export const CHATWOOT_UNIVERSITY_NAMES = [
  'Bahçeşehir Üniversitesi',
  'Galatasaray Üniversitesi',
  'Kadir Has Üniversitesi',
  'Kent Üniversitesi - Taksim',
  'Kent Üniversitesi - Kağıthane',
  'İTÜ - Ayazağa',
  'İTÜ - Maçka',
  'YTÜ - Beşiktaş',
  'YTÜ - Davutpaşa',
  'Boğaziçi - Ana Kampüs',
  'Boğaziçi - Anadolu Hisarı',
  'Atlas Üniversitesi',
  'MSGSÜ - Bomonti',
  'MSGSÜ - Beşiktaş',
  'Beykent Üniversitesi - Ayazağa',
  'Beykent Üniversitesi - Taksim',
  'Galata Üniversitesi',
  'Acıbadem Üniversitesi',
  'Medipol Üniversitesi - Kuzey',
  'Medipol Üniversitesi - Güney',
  'Yeni Yüzyıl Üniversitesi',
  'İstinye Üniversitesi - Vadi',
  'İstinye Üniversitesi - Cevizlibağ',
  'Biruni Üniversitesi',
  'Arel Üniversitesi - Cevizlibağ',
  'Marmara Üniversitesi - Göztepe',
  'Marmara Üniversitesi - Maltepe',
  'İstanbul Üniversitesi',
  'Üsküdar Üniversitesi',
  'Medeniyet Üniversitesi - Kuzey',
  'Medeniyet Üniversitesi - Güney',
  'Bezmialem Vakıf Üniversitesi',
  'Demiroğlu Bilim Üniversitesi - Gayrettepe',
  'Fenerbahçe Üniversitesi',
  'Fatih Sultan Mehmet - Fatih',
  'Fatih Sultan Mehmet - Beyoğlu',
  'Fatih Sultan Mehmet - Üsküdar',
  'Haliç Üniversitesi',
  'Işık Üniversitesi - Maslak',
  '29 Mayıs Üniversitesi',
  'Bilgi Üniversitesi - Santralistanbul',
  'Bilgi Üniversitesi - Dolapdere',
  'Bilgi Üniversitesi - Kuştepe',
  'Nişantaşı Üniversitesi - Maslak 1453',
  'Nişantaşı Üniversitesi - Nişantaşı',
  'Ticaret Üniversitesi - Küçükyalı',
  'Ticaret Üniversitesi - Üsküdar',
  'Topkapı Üniversitesi - Merter',
  'Topkapı Üniversitesi - Fatih',
  'MEF Üniversitesi - Maslak',
  'Yeditepe Üniversitesi',
  'Kültür Üniversitesi',
  'Maltepe Üniversitesi',
  'İstanbul Üniversitesi Cerrahpaşa',
  'Doğuş Üniversitesi Çengelköy',
  'Doğuş Üniversitesi Dudullu',
  'Gelişim Üniversitesi',
  'Esenyurt Üniversitesi',
  'İstanbul Aydın Üniversitesi',
  'Arel Üniversitesi - Büyükçekmece',
  'Arel Üniversitesi - Sefaköy',
  'Bahçeşehir Üniversitesi - Future Campus',
  'Bahçeşehir Üniversitesi - Göztepe',
  'Koç Üniversitesi',
  'Sabancı Üniversitesi',
  'Beykoz Üniversitesi',
  'Özyeğin Üniversitesi',
  'Okan Üniversitesi',
  'Demiroğlu Bilim Üniversitesi - Silivri',
  'Sağlık Bilimleri Üniversitesi',
  'Altınbaş Üniversitesi - Mahmutbey',
  'Altınbaş Üniversitesi - Esentepe',
  'Altınbaş Üniversitesi - Bakırköy',
  'Işık Üniversitesi - Şile',
  'İbn Haldun Üniversitesi',
  'İstanbul Galata Üniversitesi',
  'İstanbul Rumeli Üniversitesi - Silivri',
  'Piri Reis Üniversitesi',
  'Şişli MYO',
  'Ataşehir Adıgüzel MYO',
  'Sağlık ve Sosyal Bilimler MYO',
] as const;

export interface ParsedUniversity {
  uni_name: string;
  uni_shortname: string;
  district: string | null;
}

/**
 * Derives shortname and campus district from a Chatwoot university label.
 * @param name - Exact Chatwoot list value.
 */
export function parseChatwootUniversityName(name: string): ParsedUniversity {
  const dashIdx = name.indexOf(' - ');
  if (dashIdx !== -1) {
    return {
      uni_name: name,
      uni_shortname: name.slice(0, dashIdx),
      district: name.slice(dashIdx + 3),
    };
  }

  if (name === 'İstanbul Üniversitesi Cerrahpaşa') {
    return { uni_name: name, uni_shortname: 'İstanbul Üniversitesi', district: 'Cerrahpaşa' };
  }

  const embeddedCampusPrefix = 'Doğuş Üniversitesi ';
  if (name.startsWith(embeddedCampusPrefix)) {
    return {
      uni_name: name,
      uni_shortname: 'Doğuş Üniversitesi',
      district: name.slice(embeddedCampusPrefix.length),
    };
  }

  return { uni_name: name, uni_shortname: name, district: null };
}

/** Parsed rows for DB seed — one row per Chatwoot list value. */
export const CHATWOOT_UNIVERSITY_ROWS: ParsedUniversity[] = CHATWOOT_UNIVERSITY_NAMES.map(
  parseChatwootUniversityName,
);

/**
 * Looks up shortname for a Chatwoot university value (exact or trimmed match).
 * @param university - Value from Chatwoot custom attribute or lead_details.university.
 */
export function resolveSchoolShortnameFromUniversity(
  university: string | null | undefined,
): string | null {
  if (!university) return null;
  const trimmed = university.trim();
  const row = CHATWOOT_UNIVERSITY_ROWS.find((r) => r.uni_name === trimmed);
  return row?.uni_shortname ?? null;
}
