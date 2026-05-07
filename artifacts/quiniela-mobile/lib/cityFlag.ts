const CITY_TO_COUNTRY: Record<string, string> = {
  "atlanta": "us",
  "boston": "us",
  "dallas": "us",
  "filadelfia": "us",
  "philadelphia": "us",
  "houston": "us",
  "kansas city": "us",
  "los ángeles": "us",
  "los angeles": "us",
  "miami": "us",
  "nueva york": "us",
  "new york": "us",
  "san francisco": "us",
  "seattle": "us",
  "ciudad de méxico": "mx",
  "ciudad de mexico": "mx",
  "mexico city": "mx",
  "guadalajara": "mx",
  "monterrey": "mx",
  "toronto": "ca",
  "vancouver": "ca",
};

export function cityFlagUrl(city?: string | null): string | null {
  if (!city) return null;
  const code = CITY_TO_COUNTRY[city.trim().toLowerCase()];
  if (!code) return null;
  return `https://flagcdn.com/w40/${code}.png`;
}
