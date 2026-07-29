-- Rename the members-only spaces: Girls' Closet -> Her Circle, Boys' Den -> His Circle.
--
-- The old names described stuff, and only half the stuff each: a "closet" is
-- clothes, a "den" is a console. Both spaces have always carried listings,
-- requests and conversation, and the naming quietly told half the campus what
-- their space was supposed to be for. "Circle" names the people instead.
--
-- 0004 seeded the original names and is left untouched — committed migrations are
-- history, not state. This one is written to be re-runnable: it matches the old
-- OR new name, so applying it twice is a no-op rather than an error.
--
-- The emoji change is part of the same point. 👗 and 🎮 are the exact stereotype
-- being dropped; 💜 and 💙 are symmetric and say nothing about what you bring.

alter table spaces
  add column if not exists description text;

comment on column spaces.description is
  'One line shown under the space name. Explains who it is for and what it is for.';

update spaces
set name = 'Her Circle',
    emoji = '💜',
    description = 'A verified women-only space to buy, sell, swap, and talk freely with others on campus.'
where name in ('Girls'' Closet', 'Her Circle');

update spaces
set name = 'His Circle',
    emoji = '💙',
    description = 'A verified men-only space to buy, sell, swap, and talk freely with others on campus.'
where name in ('Boys'' Den', 'His Circle');
