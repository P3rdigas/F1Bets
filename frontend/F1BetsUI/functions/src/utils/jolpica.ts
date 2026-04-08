const JOLPICA_BASE_URL = "https://api.jolpi.ca/ergast/f1";

export function getCurrentSeasonYear() {
  return new Date().getFullYear().toString();
}

export async function fetchJolpicaJson(seasonYear: string, endpoint: string) {
  const response = await fetch(`${JOLPICA_BASE_URL}/${seasonYear}/${endpoint}.json`);

  if (!response.ok) {
    throw new Error(
      `Jolpica request failed: ${response.status} ${response.statusText} (${response.url})`
    );
  }

  return response.json();
}
