// dependency https://flagicons.lipis.dev/
import 'flag-icons/css/flag-icons.min.css';

const countryAliasMap: Record<string, string> = {
	australia: 'au',
    australian: 'au',

    austria: 'at',

	azerbaijan: 'az',

	belgium: 'be',

	brazil: 'br',

    canada: 'ca',
    canadian: 'ca',

    china: 'cn',
    chinese: 'cn',

    japan: 'jp',
    japanese: 'jp',

	hungary: 'hu',

	italy: 'it',

	mexico: 'mx',

    monaco: 'mc',
    monegasque: 'mc',

	netherlands: 'nl',

	qatar: 'qa',

	singapore: 'sg',

    spain: 'es',
    spanish: 'es',

	uae: 'ae',

    uk: 'gb',
    british: 'gb',

    usa: 'us',
    american: 'us',
}

function normalizeCountryCode(value?: string | null): string | null {
  if (!value) return null;

  const normalized = value.trim().toLowerCase();

  return countryAliasMap[normalized] ?? null;
}

export function getFlagClass(value?: string | null): string {
  	const countryCode = normalizeCountryCode(value);

	return countryCode ? `fi fi-${countryCode} fis` : 'fi fi-xx fis';
}