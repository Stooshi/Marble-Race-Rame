import { COUNTRY_LIST } from './countries';

/** A select of every country (ISO 3166-1, by name), with "No country" first. `value`: a code or ''. */
export default function CountryPicker({ value, onChange, disabled = false, id, label, noneLabel = 'No country' }) {
  return (
    <select id={id} aria-label={label} value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled} autoComplete="country">
      <option value="">{noneLabel}</option>
      {COUNTRY_LIST.map(([code, name]) => <option key={code} value={code}>{name}</option>)}
    </select>
  );
}
