const countryAliasMap: Record<string, string> = {
    usa: 'usa',
    american: 'usa',
}

function normalizeCountryKey(value?: string | null): string | null {
    if (!value) return null;

    const normalized = value.trim().toLowerCase();

    return countryAliasMap[normalized] ?? null;
}

export function getFlagSrc(value?: string | null): string {
    const countryKey = normalizeCountryKey(value);

    if (!countryKey) return '/flags/default.png';

    return `/flags/${countryKey}.png`;
}