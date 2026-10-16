/** Who runs Marble Spins (client/src/shared/company.json), formatted for the pages. */
import company from '../shared/company.json';

export { company };
export const ADDRESS = `${company.street}, ${company.postcode} ${company.city}, ${company.country}`;
/** "Marble Spins is operated by Voltron Robotics AB, org.nr 559344-3756" */
export const OPERATED_BY = `Marble Spins is operated by ${company.name}, org.nr ${company.orgNo}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** The legal texts' "last updated" date, e.g. "16 October 2026". */
export const LEGAL_UPDATED = (() => { const [y, m, d] = company.legalUpdated.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; })();
