/**
 * The marbles hub's sections, in the order they are shown (claude/marbles-hub-plan.md, §1):
 * /marbles/<section>/<article>. A section without a published article has no page and isn't listed.
 */
export const HUB_PATH = '/marbles';

export const HUB = {
  title: 'Marbles: history, games, types and racing',
  short: 'Marbles',
  description: "Everything about marbles: how they're made, the games kids play around the world, how to spot old marbles, and the physics of marble racing.",
  intro: "Marbles have been rolled, flicked and collected for centuries. Here you'll find the rules of the classic games, how marbles are made, the main kinds and their names, and where marble racing came from. Every fact comes with its sources.",
};

export const SECTIONS = [
  { key: 'games', title: 'Marble games', heading: 'Marble games from around the world', description: 'Rules for the classic marble games, from Ringer and Ring Taw to hole games, plus the versions kids play around the world.', intro: 'How to play: the words, the shots and the rules of the classic games.' },
  { key: 'history', title: 'History', heading: 'The history of marbles', description: 'Where marbles come from: ancient finds, schoolyard games through the centuries and the great marble makers.', intro: 'From ancient stone balls to the machine-made marbles of the 20th century.' },
  { key: 'making', title: 'How marbles are made', heading: 'How marbles are made', description: 'How glass marbles are made, by hand and by machine, and the art glass marbles made today.', intro: 'Glass canes, marble scissors and the machines that made millions a day.' },
  { key: 'types', title: 'Types and collecting', heading: 'Marble types and collecting', description: "The main kinds of marble and their names, how collectors tell old from new, and what decides a marble's value.", intro: "Cat's eyes, swirls, onionskins and more: what to call a marble, and what collectors look for." },
  { key: 'racing', title: 'Marble racing', heading: 'Marble racing', description: 'Where marble racing came from, and the physics of a marble run.', intro: 'Gravity, friction and a good track: why marbles race the way they do.' },
];

export const sectionOf = (key) => SECTIONS.find((s) => s.key === key) ?? null;
