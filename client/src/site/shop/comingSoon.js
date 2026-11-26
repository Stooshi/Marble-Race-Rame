/**
 * The "Coming soon" shelf's teaser marbles: flat pictures of three marbles from
 * each next collection (the first one shown as a dark silhouette: it stays a
 * secret). Our own art, from the collection board; the collections' names and
 * dates are in catalog.json → comingSoon.
 */
const T = 'rgba(0,0,0,0)';
const GLASS = 'radial-gradient(circle, rgba(235,248,255,0.95) 0, rgba(170,215,240,0.8) 75%, #5E8FAE 100%)';

/** Small round spots at fixed places (seeded, so the pictures never change). */
function dots(n, rMin, rMax, colours, seed) {
  let s = seed;
  const rnd = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const out = [];
  for (let i = 0; i < n; i += 1) {
    const r = rMin + rnd() * (rMax - rMin);
    const x = 12 + rnd() * 76;
    const y = 12 + rnd() * 76;
    out.push(`radial-gradient(circle at ${x.toFixed(1)}% ${y.toFixed(1)}%, ${colours[i % colours.length]} 0 ${r.toFixed(1)}%, ${T} ${(r + 0.8).toFixed(1)}%)`);
  }
  return out.join(', ');
}
const STARS = dots(9, 0.6, 1.4, ['#FFFFFF'], 11);

export const TEASERS = {
  HH: [
    { name: 'A secret Legendary', bg: `radial-gradient(circle at 64% 42%, #E8ECF2 0 8%, ${T} 9%), radial-gradient(ellipse 24% 14% at 48% 56%, #E8ECF2 0 70%, ${T} 100%), ${GLASS}`, secret: true },
    { name: 'Lutz', bg: `${dots(10, 0.5, 1, ['#FFF4CC'], 5)}, repeating-conic-gradient(from 0deg, ${T} 0 30deg, rgba(212,160,40,0.95) 30deg 37deg, rgba(255,230,140,0.95) 37deg 39deg, ${T} 39deg 60deg), radial-gradient(circle, #2C5AA0 0, #0B2350 100%)`, glow: 'rgba(255,210,100,0.45)' },
    { name: 'End of Day', bg: `${dots(16, 3, 6.5, ['#E5322D', '#1F7FD6', '#FFD21F', '#3DDC97', '#8E5CF5', '#FF7A1A'], 3)}, radial-gradient(circle, #FBF6EA, #E4DCCB)` },
  ],
  MG: [
    { name: 'A secret Legendary', bg: `radial-gradient(circle, #05060A 0 34%, rgba(255,240,200,0.95) 36%, rgba(255,180,60,0.6) 42%, ${T} 60%), ${STARS}, radial-gradient(circle, #0E1320, #000000)`, secret: true },
    { name: 'Starlight', bg: `radial-gradient(circle, #FFFFFF 0 4%, rgba(255,236,150,0.95) 8%, rgba(255,210,31,0.4) 22%, ${T} 40%), ${STARS}, #0B1A40`, glow: 'rgba(255,210,31,0.5)' },
    { name: 'Vaseline', bg: 'radial-gradient(circle, #F4FF8A 0, #C8E83A 50%, #6E9A10 100%)', glow: 'rgba(190,255,60,0.6)' },
  ],
  AG: [
    { name: 'A secret Legendary', bg: `radial-gradient(ellipse 30% 7% at 44% 48%, ${T} 0 72%, rgba(255,230,180,0.9) 78%, ${T} 92%), radial-gradient(circle at 44% 47%, #FFB27A 0, #E8580C 12%, #6B2A06 18%, ${T} 19%), ${STARS}, #060A1E`, secret: true },
    { name: 'Jellyfish', bg: `radial-gradient(ellipse 24% 14% at 50% 40%, rgba(255,170,225,0.95) 0 60%, ${T} 100%), radial-gradient(circle, rgba(200,245,250,0.95) 0, rgba(90,190,215,0.85) 75%, #2E7F99 100%)` },
    { name: 'Dichroic', bg: 'repeating-linear-gradient(45deg, rgba(255,255,255,0.15) 0 2%, rgba(0,0,0,0) 2% 6%), conic-gradient(from 0deg, #13A8A8, #E040C8, #FFD21F, #3DB5FF, #8E5CF5, #13A8A8)', glow: 'rgba(224,64,200,0.35)' },
  ],
};
