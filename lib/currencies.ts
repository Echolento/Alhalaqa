export interface Currency {
  code: string
  name: string
  nameAr: string
  symbol: string
}

export const currencies: Currency[] = [
  { code: 'AED', name: 'UAE Dirham', nameAr: 'الدرهم الإماراتي', symbol: 'د.إ' },
  { code: 'BHD', name: 'Bahraini Dinar', nameAr: 'الدينار البحريني', symbol: '.د.ب' },
  { code: 'DJF', name: 'Djiboutian Franc', nameAr: 'الفرنك الجيبوتي', symbol: 'Fdj' },
  { code: 'DZD', name: 'Algerian Dinar', nameAr: 'الدينار الجزائري', symbol: 'د.ج' },
  { code: 'EGP', name: 'Egyptian Pound', nameAr: 'الجنية المصري', symbol: 'ج.م' },
  { code: 'IQD', name: 'Iraqi Dinar', nameAr: 'الدينار العراقي', symbol: 'د.ع' },
  { code: 'JOD', name: 'Jordanian Dinar', nameAr: 'الدينار الأردني', symbol: 'د.ا' },
  { code: 'KMF', name: 'Comorian Franc', nameAr: 'الفرنك القمري', symbol: 'CF' },
  { code: 'KWD', name: 'Kuwaiti Dinar', nameAr: 'الدينار الكويتي', symbol: 'د.ك' },
  { code: 'LBP', name: 'Lebanese Pound', nameAr: 'الليرة اللبنانية', symbol: 'ل.ل' },
  { code: 'LYD', name: 'Libyan Dinar', nameAr: 'الدينار الليبي', symbol: 'ل.د' },
  { code: 'MAD', name: 'Moroccan Dirham', nameAr: 'الدرهم المغربي', symbol: 'د.م.' },
  { code: 'MRU', name: 'Ouguiya', nameAr: 'الأوقية', symbol: 'UM' },
  { code: 'OMR', name: 'Omani Rial', nameAr: 'الريال العماني', symbol: 'ر.ع.' },
  { code: 'QAR', name: 'Qatari Riyal', nameAr: 'الريال القطري', symbol: 'ر.ق' },
  { code: 'SAR', name: 'Saudi Riyal', nameAr: 'الريال السعودي', symbol: 'ر.س' },
  { code: 'SDG', name: 'Sudanese Pound', nameAr: 'الجنيه السوداني', symbol: 'ج.س' },
  { code: 'SOS', name: 'Somali Shilling', nameAr: 'الشلن الصومالي', symbol: 'Sh.So.' },
  { code: 'SYP', name: 'Syrian Pound', nameAr: 'الليرة السورية', symbol: '£' },
  { code: 'TND', name: 'Tunisian Dinar', nameAr: 'الدينار التونسي', symbol: 'د.ت' },
  { code: 'YER', name: 'Yemeni Rial', nameAr: 'الريال اليمني', symbol: '﷼' },
  { code: 'TRY', name: 'Turkish Lira', nameAr: 'الليرة التركية', symbol: '₺' },
  { code: 'EUR', name: 'Euro', nameAr: 'اليورو', symbol: '€' },
  { code: 'USD', name: 'US Dollar', nameAr: 'الدولار', symbol: '$' },
]

export function getCurrencySymbol(code: string): string {
  return currencies.find(c => c.code === code)?.symbol || code
}
