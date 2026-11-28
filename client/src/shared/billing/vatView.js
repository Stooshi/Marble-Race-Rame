/**
 * How a receipt or credit note shows its VAT (Moses, 16 Nov 2026, after K-2026-00001 showed "VAT 6.63% · US$0.00"
 * next to "not applicable"): a rate only with an amount. When no VAT was charged, only 0% or "not applicable",
 * with the country in that line. The same rules as the server's PDF (src/billing/vatView.js, kept identical:
 * test/billingPdf.test.js compares them). Reads a document's frozen snapshot; never changes it.
 *
 *   vatView(doc) → { charged, lineVat(line, money), totalLabel, note, countryLine }
 */
export const EU = ['AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR', 'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL', 'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'];

export function vatView(doc) {
  const vatCents = doc?.totals?.vatCents ?? 0;
  const charged = vatCents !== 0;
  const country = doc?.vat?.country ?? null;
  const outside = !charged && Boolean(country) && !EU.includes(country);
  const rate = charged ? (doc?.vat?.rate ?? null) : 0;
  return {
    charged,
    lineVat: (line, money) => {
      if (!charged || !line.vatCents) return outside ? 'Not applicable' : '0%';
      return line.vatRate ? `${line.vatRate}% · ${money(line.vatCents)}` : money(line.vatCents);
    },
    totalLabel: charged ? `VAT${rate ? ` ${rate}%` : ''}` : outside ? 'VAT (not applicable)' : 'VAT 0%',
    note: charged ? null : outside ? `VAT: not applicable (sale outside the EU, customer country ${country}).` : 'VAT: 0%.',
    countryLine: charged && country ? `VAT country: ${country}` : null,
  };
}
