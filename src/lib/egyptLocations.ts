// Egypt Governorates and Cities Data - Bilingual (Arabic / English)

export interface EgyptCity {
  ar: string;
  en: string;
}
export interface EgyptGovernorate {
  ar: string;
  en: string;
  cities: EgyptCity[];
}

export const egyptGovernorates: EgyptGovernorate[] = [
  {
    ar: "القاهرة",
    en: "Cairo",
    cities: [
      { ar: "مدينة نصر", en: "Nasr City" },
      { ar: "المعادي", en: "Maadi" },
      { ar: "التجمع الخامس", en: "New Cairo" },
      { ar: "مدينة بدر", en: "Badr City" },
      { ar: "العباسية", en: "Abbassia" },
      { ar: "الزيتون", en: "Zeitoun" },
      { ar: "الزمالك", en: "Zamalek" },
      { ar: "وسط البلد", en: "Downtown Cairo" },
      { ar: "حلوان", en: "Helwan" },
      { ar: "المطرية", en: "Mataria" },
      { ar: "شبرا", en: "Shubra" },
      { ar: "عين شمس", en: "Ain Shams" },
      { ar: "مصر الجديدة", en: "Heliopolis" },
      { ar: "المقطم", en: "Mokattam" },
      { ar: "السلام", en: "El Salam" },
      { ar: "المرج", en: "El Marg" },
      { ar: "دار السلام", en: "Dar El Salam" },
      { ar: "الوايلي", en: "Waili" },
      { ar: "منشأة ناصر", en: "Manshiet Nasr" },
      { ar: "عزبة النخل", en: "Ezbet El Nakhl" },
    ],
  },
  {
    ar: "الجيزة",
    en: "Giza",
    cities: [
      { ar: "الدقي", en: "Dokki" },
      { ar: "العجوزة", en: "Agouza" },
      { ar: "6 أكتوبر", en: "6th of October City" },
      { ar: "الشيخ زايد", en: "Sheikh Zayed" },
      { ar: "المهندسين", en: "Mohandessin" },
      { ar: "حدائق الأهرام", en: "Hadayek El Ahram" },
      { ar: "الهرم", en: "Haram" },
      { ar: "إمبابة", en: "Imbaba" },
      { ar: "فيصل", en: "Faisal" },
      { ar: "بولاق الدكرور", en: "Bulaq El Dakrour" },
      { ar: "أوسيم", en: "Ausim" },
      { ar: "الجيزة", en: "Giza City" },
      { ar: "البدرشين", en: "Badrasheen" },
      { ar: "الصف", en: "El Saf" },
    ],
  },
  {
    ar: "الإسكندرية",
    en: "Alexandria",
    cities: [
      { ar: "المنتزه", en: "Montazah" },
      { ar: "العجمي", en: "Agami" },
      { ar: "سيدي بشر", en: "Sidi Bishr" },
      { ar: "سيدي جابر", en: "Sidi Gaber" },
      { ar: "محرم بك", en: "Moharam Bek" },
      { ar: "اللبان", en: "Labban" },
      { ar: "باكوس", en: "Bakos" },
      { ar: "كليوباترا", en: "Cleopatra" },
      { ar: "ستانلي", en: "Stanley" },
      { ar: "سموحة", en: "Smouha" },
      { ar: "الرمل", en: "El Raml" },
      { ar: "الإبراهيمية", en: "Ibrahimia" },
      { ar: "الدخيلة", en: "El Dekheila" },
      { ar: "برج العرب", en: "Borg El Arab" },
      { ar: "أبو قير", en: "Abu Qir" },
    ],
  },
  {
    ar: "البحيرة",
    en: "Beheira",
    cities: [
      { ar: "دمنهور", en: "Damanhur" },
      { ar: "كفر الدوار", en: "Kafr El Dawar" },
      { ar: "رشيد", en: "Rashid" },
      { ar: "أبو حمص", en: "Abu Homs" },
      { ar: "إيتاي البارود", en: "Itay El Baroud" },
      { ar: "شبراخيت", en: "Shubrakhit" },
      { ar: "وادي النطرون", en: "Wadi El Natrun" },
    ],
  },
  {
    ar: "المنوفية",
    en: "Menofia",
    cities: [
      { ar: "شبين الكوم", en: "Shibin El Kom" },
      { ar: "منوف", en: "Menouf" },
      { ar: "تلا", en: "Tala" },
      { ar: "أشمون", en: "Ashmoun" },
      { ar: "قويسنا", en: "Quesna" },
      { ar: "بركة السبع", en: "Birket El Sab" },
      { ar: "الباجور", en: "El Bagour" },
    ],
  },
  {
    ar: "الغربية",
    en: "Gharbia",
    cities: [
      { ar: "طنطا", en: "Tanta" },
      { ar: "المحلة الكبرى", en: "El Mahalla El Kubra" },
      { ar: "كفر الزيات", en: "Kafr El Zayat" },
      { ar: "زفتى", en: "Zefta" },
      { ar: "سمنود", en: "Samannoud" },
      { ar: "بسيون", en: "Basyoun" },
    ],
  },
  {
    ar: "الدقهلية",
    en: "Dakahlia",
    cities: [
      { ar: "المنصورة", en: "Mansoura" },
      { ar: "طلخا", en: "Talha" },
      { ar: "ميت غمر", en: "Mit Ghamr" },
      { ar: "أجا", en: "Aga" },
      { ar: "دكرنس", en: "Dekernes" },
      { ar: "السنبلاوين", en: "El Sinbillawin" },
      { ar: "بلقاس", en: "Belqas" },
      { ar: "المنزلة", en: "El Manzala" },
    ],
  },
  {
    ar: "الشرقية",
    en: "Sharqia",
    cities: [
      { ar: "الزقازيق", en: "Zagazig" },
      { ar: "بلبيس", en: "Belbeis" },
      { ar: "أبو كبير", en: "Abu Kabir" },
      { ar: "العاشر من رمضان", en: "10th of Ramadan City" },
      { ar: "فاقوس", en: "Faqous" },
      { ar: "الصالحية الجديدة", en: "El Salheya El Gedida" },
      { ar: "ديرب نجم", en: "Dirb Negm" },
    ],
  },
  {
    ar: "القليوبية",
    en: "Qalyubia",
    cities: [
      { ar: "بنها", en: "Banha" },
      { ar: "القناطر الخيرية", en: "El Qanater El Khairia" },
      { ar: "قليوب", en: "Qalyub" },
      { ar: "شبرا الخيمة", en: "Shubra El Kheima" },
      { ar: "الخانكة", en: "El Khanka" },
      { ar: "طوخ", en: "Tukh" },
      { ar: "كفر شكر", en: "Kafr Shukr" },
      { ar: "العبور", en: "El Obour" },
    ],
  },
  {
    ar: "كفر الشيخ",
    en: "Kafr El Sheikh",
    cities: [
      { ar: "كفر الشيخ", en: "Kafr El Sheikh City" },
      { ar: "دسوق", en: "Desouq" },
      { ar: "فوه", en: "Fuwa" },
      { ar: "الحامول", en: "El Hamoul" },
      { ar: "مطوبس", en: "Metobas" },
      { ar: "قلين", en: "Qallin" },
    ],
  },
  {
    ar: "دمياط",
    en: "Damietta",
    cities: [
      { ar: "دمياط", en: "Damietta City" },
      { ar: "رأس البر", en: "Ras El Bar" },
      { ar: "دمياط الجديدة", en: "New Damietta" },
      { ar: "فارسكور", en: "Faraskour" },
      { ar: "كفر سعد", en: "Kafr Saad" },
    ],
  },
  {
    ar: "بورسعيد",
    en: "Port Said",
    cities: [
      { ar: "بورسعيد", en: "Port Said City" },
      { ar: "بورفؤاد", en: "Port Fouad" },
      { ar: "شرق", en: "East District" },
      { ar: "غرب", en: "West District" },
    ],
  },
  {
    ar: "الإسماعيلية",
    en: "Ismailia",
    cities: [
      { ar: "الإسماعيلية", en: "Ismailia City" },
      { ar: "القنطرة", en: "El Qantara" },
      { ar: "فايد", en: "Fayed" },
      { ar: "التل الكبير", en: "El Tal El Kebir" },
    ],
  },
  {
    ar: "السويس",
    en: "Suez",
    cities: [
      { ar: "السويس", en: "Suez City" },
      { ar: "عتاقة", en: "Attaka" },
      { ar: "الجناين", en: "El Ganayen" },
    ],
  },
  {
    ar: "الأقصر",
    en: "Luxor",
    cities: [
      { ar: "الأقصر", en: "Luxor City" },
      { ar: "الكرنك", en: "Karnak" },
      { ar: "إسنا", en: "Esna" },
      { ar: "الأرمنت", en: "Armant" },
    ],
  },
  {
    ar: "أسوان",
    en: "Aswan",
    cities: [
      { ar: "أسوان", en: "Aswan City" },
      { ar: "كوم أمبو", en: "Kom Ombo" },
      { ar: "إدفو", en: "Edfu" },
      { ar: "أبو سمبل", en: "Abu Simbel" },
    ],
  },
  {
    ar: "قنا",
    en: "Qena",
    cities: [
      { ar: "قنا", en: "Qena City" },
      { ar: "نجع حمادي", en: "Nag Hammadi" },
      { ar: "دشنا", en: "Dishna" },
      { ar: "قوص", en: "Qous" },
    ],
  },
  {
    ar: "سوهاج",
    en: "Sohag",
    cities: [
      { ar: "سوهاج", en: "Sohag City" },
      { ar: "أخميم", en: "Akhmim" },
      { ar: "طهطا", en: "Tahta" },
      { ar: "جرجا", en: "Gerga" },
      { ar: "المراغة", en: "El Maraga" },
    ],
  },
  {
    ar: "أسيوط",
    en: "Asyut",
    cities: [
      { ar: "أسيوط", en: "Asyut City" },
      { ar: "ديروط", en: "Dairut" },
      { ar: "أبنوب", en: "Abnub" },
      { ar: "منفلوط", en: "Manfalut" },
      { ar: "أبو تيج", en: "Abu Tieg" },
      { ar: "القوسية", en: "El Qusiya" },
    ],
  },
  {
    ar: "المنيا",
    en: "Minya",
    cities: [
      { ar: "المنيا", en: "Minya City" },
      { ar: "ملوي", en: "Mallawi" },
      { ar: "سمالوط", en: "Samalout" },
      { ar: "بني مزار", en: "Beni Mazar" },
      { ar: "أبو قرقاص", en: "Abu Qurqas" },
    ],
  },
  {
    ar: "الفيوم",
    en: "Faiyum",
    cities: [
      { ar: "الفيوم", en: "Faiyum City" },
      { ar: "سنورس", en: "Sinnuris" },
      { ar: "إطسا", en: "Itsa" },
      { ar: "طامية", en: "Tamiya" },
    ],
  },
  {
    ar: "بني سويف",
    en: "Beni Suef",
    cities: [
      { ar: "بني سويف", en: "Beni Suef City" },
      { ar: "ببا", en: "Beba" },
      { ar: "الواسطى", en: "El Wasta" },
      { ar: "سمسطا", en: "Samasta" },
    ],
  },
  {
    ar: "البحر الأحمر",
    en: "Red Sea",
    cities: [
      { ar: "الغردقة", en: "Hurghada" },
      { ar: "سفاجا", en: "Safaga" },
      { ar: "القصير", en: "El Quseir" },
      { ar: "مرسى علم", en: "Marsa Alam" },
      { ar: "رأس غارب", en: "Ras Gharib" },
      { ar: "الجونة", en: "El Gouna" },
    ],
  },
  {
    ar: "جنوب سيناء",
    en: "South Sinai",
    cities: [
      { ar: "شرم الشيخ", en: "Sharm El Sheikh" },
      { ar: "دهب", en: "Dahab" },
      { ar: "نويبع", en: "Nuweiba" },
      { ar: "طابا", en: "Taba" },
      { ar: "سانت كاترين", en: "Saint Catherine" },
    ],
  },
  {
    ar: "شمال سيناء",
    en: "North Sinai",
    cities: [
      { ar: "العريش", en: "Arish" },
      { ar: "رفح", en: "Rafah" },
      { ar: "الشيخ زويد", en: "Sheikh Zuweid" },
      { ar: "بئر العبد", en: "Bir El Abd" },
    ],
  },
  {
    ar: "مطروح",
    en: "Matruh",
    cities: [
      { ar: "مرسى مطروح", en: "Mersa Matruh" },
      { ar: "سيوة", en: "Siwa" },
      { ar: "الضبعة", en: "El Dabaa" },
      { ar: "الساحل الشمالي", en: "North Coast" },
    ],
  },
  {
    ar: "الوادي الجديد",
    en: "New Valley",
    cities: [
      { ar: "الخارجة", en: "Kharga" },
      { ar: "الداخلة", en: "Dakhla" },
      { ar: "الفرافرة", en: "Farafra" },
    ],
  },
];

export const getCitiesForGovernorate = (
  governorateName: string,
  lang: "ar" | "en",
) => {
  const gov = egyptGovernorates.find(
    (g) => g.ar === governorateName || g.en === governorateName,
  );
  return gov ? gov.cities : [];
};
