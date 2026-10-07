// country flags for nodes: an ISO 3166 code ("DE") <-> its emoji and name
export const flagEmoji = (code?: string) =>
  code && /^[A-Za-z]{2}$/.test(code)
    ? String.fromCodePoint(...code.toUpperCase().split("").map((c) => 0x1f1e6 + c.charCodeAt(0) - 65))
    : "";

// the usual VPS locations first, then the rest
export const COUNTRIES = [
  "DE", "NL", "FI", "SE", "FR", "GB", "PL", "TR", "RU", "US", "CA", "AE", "KZ", "UZ", "TM", "AM", "GE", "AZ",
  "LV", "LT", "EE", "CH", "AT", "CZ", "RO", "BG", "HU", "IT", "ES", "PT", "NO", "DK", "IE", "UA", "MD", "RS",
  "GR", "CY", "IL", "IR", "IN", "SG", "JP", "KR", "HK", "TW", "CN", "VN", "TH", "MY", "ID", "AU", "BR", "AR",
  "MX", "ZA", "EG", "SA", "QA", "KG", "TJ", "MN", "BY", "IS", "LU", "BE", "SK", "SI", "HR",
];

export const countryName = (code: string, lang: string) => {
  try {
    const name = new (Intl as any).DisplayNames([lang, "en"], { type: "region" }).of(code);
    return name && name !== code ? name : code;
  } catch {
    return code;
  }
};
