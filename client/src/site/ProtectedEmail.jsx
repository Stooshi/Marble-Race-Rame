import { useEffect, useState } from 'react';

/**
 * An email address shown as text for people, kept away from spam bots that harvest addresses
 * from page HTML: the page (and its pre-rendered copy) holds only "support (at) marblespins.com";
 * once the page runs in a browser it becomes a normal mailto link.
 */
export default function ProtectedEmail({ address }) {
  const [live, setLive] = useState(false);
  useEffect(() => { setLive(true); }, []);
  const [user, domain] = String(address).split('@');
  if (!live) return <span className="ms-email">{`${user} (at) ${domain}`}</span>;
  return <a className="ms-email" href={`mailto:${user}@${domain}`}>{`${user}@${domain}`}</a>;
}
