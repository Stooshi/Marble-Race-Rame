// The country a player races for (Moses, 22 Oct 2026; src/country on the server): the ISO list and
// how a country is shown. Shown by its name only, no flag: names read the same everywhere, and flag
// emoji don't show on Windows (two letters instead) and carry politics we don't need. The names are
// CLDR's English ones (client/src/shared/countries.json), the same as Apple's and Google's.
import data from '../../shared/countries.json';

export const COUNTRIES = data.countries;
export const COUNTRY_LIST = Object.entries(COUNTRIES); // [code, name], sorted by name
export const countryName = (code) => (code && COUNTRIES[code]) || null;
export const CHANGE_DAYS = 90;
export const CHANGE_RULE = `You can change your country once every ${CHANGE_DAYS} days.`;

/** A guess for the picker when the server has none (a local or unknown address): the browser's region, e.g. sv-SE → SE. */
export function browserCountry() {
  try {
    const loc = new Intl.Locale(navigator.language || '');
    const region = loc.maximize().region;
    return region && COUNTRIES[region] ? region : null;
  } catch {
    return null;
  }
}

