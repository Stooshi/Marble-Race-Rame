/** Who runs Marble Spins (client/src/shared/company.json), formatted for the pages. */
import company from '../shared/company.json';

export { company };
export const ADDRESS = `${company.street}, ${company.postcode} ${company.city}, ${company.country}`;
/** "Marble Spins is operated by Voltron Robotics AB, org.nr 559344-3756" */
export const OPERATED_BY = `Marble Spins is operated by ${company.name}, org.nr ${company.orgNo}`;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
/** The legal texts' "last updated" date, e.g. "16 October 2026". */
export const LEGAL_UPDATED = (() => { const [y, m, d] = company.legalUpdated.split('-').map(Number); return `${d} ${MONTHS[m - 1]} ${y}`; })();
/** Where every "Contact us" link goes: the contact form at the end of the Help Centre. */
export const CONTACT_PATH = '/help#contact';

/** schema.org Organization for search engines (on the landing page): who runs Marble Spins and its social profiles. */
export function organizationStructuredData(siteUrl, socialLinks) {
  const sameAs = ['youtube', 'instagram', 'tiktok'].map((k) => socialLinks?.[k]).filter((u) => /^https:\/\//.test(u ?? ''));
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Marble Spins',
    legalName: company.name,
    url: `${siteUrl}/`,
    logo: `${siteUrl}/icon-512.png`,
    vatID: company.vatNo,
    address: { '@type': 'PostalAddress', streetAddress: company.street, postalCode: company.postcode, addressLocality: company.city, addressCountry: 'SE' },
    contactPoint: { '@type': 'ContactPoint', contactType: 'customer support', url: `${siteUrl}/help#contact` },
    ...(sameAs.length && { sameAs }),
  };
}
