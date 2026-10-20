-- One-time data update: every player gets their own 4 starter marbles (Moses, 20 Oct 2026).
--
-- The 4 shared starters (Ruby, Sapphire, Emerald, Topaz) are no longer anyone's: the server now
-- gives every player their own 4 (src/marbles/starters.js; new players when their account is made,
-- everyone else the first time they need them: racing, their Marble Bag). The shared 4 stay in the
-- catalogue as they are (computer players still race in them; old races keep them; never for sale).
-- A Shooter set to one of the shared 4 is cleared, so that player races their own first starter, and
-- the "favourite" rows they got are removed.

DELETE FROM user_shooter
 WHERE marble_id IN (SELECT id FROM marbles WHERE slug IN ('ruby', 'sapphire', 'emerald', 'topaz') AND owner_id IS NULL);

DELETE FROM user_marbles
 WHERE marble_id IN (SELECT id FROM marbles WHERE slug IN ('ruby', 'sapphire', 'emerald', 'topaz') AND owner_id IS NULL);

SELECT (SELECT count(*) FROM user_shooter s JOIN marbles m ON m.id = s.marble_id WHERE m.owner_id IS NULL AND m.is_starter) AS shooters_on_shared_starters,
       (SELECT count(*) FROM marbles WHERE owner_id IS NULL AND is_active) AS catalogue_marbles;
