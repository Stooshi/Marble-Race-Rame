/**
 * Marble Spins on YouTube, Instagram and TikTok (client/src/shared/socialLinks.json), as icon links
 * that open in a new tab. Website only: nothing inside the apps for now.
 * Icons: Simple Icons (CC0), drawn in the text colour.
 */
import { siInstagram, siTiktok, siYoutube } from 'simple-icons';
import links from '../shared/socialLinks.json';
import { isNativeApp } from '../app/native';

export const SOCIAL = [
  ['youtube', 'YouTube', siYoutube],
  ['instagram', 'Instagram', siInstagram],
  ['tiktok', 'TikTok', siTiktok],
].map(([key, name, icon]) => ({ key, name, icon, url: links[key] })).filter((s) => /^https:\/\//.test(s.url ?? ''));

/** The profile addresses, for search engines (Organization "sameAs"). */
export const SOCIAL_URLS = SOCIAL.map((s) => s.url);

export default function SocialLinks({ size = 22, className = '' }) {
  if (isNativeApp() || SOCIAL.length === 0) return null;
  return (
    <ul className={`ms-social ${className}`.trim()} aria-label="Marble Spins on social media">
      {SOCIAL.map((s) => (
        <li key={s.key}>
          <a href={s.url} target="_blank" rel="noopener noreferrer" aria-label={`Marble Spins on ${s.name} (opens in a new tab)`} title={`Marble Spins on ${s.name}`}>
            <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" focusable="false"><path d={s.icon.path} fill="currentColor" /></svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
