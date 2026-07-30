-- Seed the Toolbox with the free-resources list.
--
-- showcase_items is college-scoped (0018), so this inserts one row per resource
-- per college, the same shape 0004 used to seed spaces. Idempotent: it skips any
-- (college, url) pair that already exists, so re-running adds nothing and a
-- college that appears later can be topped up by running it again.
--
-- created_by is attributed to that college's moderator where one exists; 0050
-- made the column nullable, so a college without a moderator still gets the rows.

insert into showcase_items (college_id, created_by, name, url, tagline, category)
select
  g.id,
  (select p.id from profiles p where p.college_id = g.id and p.is_moderator limit 1),
  v.name, v.url, v.tagline, v.category
from colleges g
cross join (values
  -- Academic papers
  ('Unpaywall', 'https://unpaywall.org',
   'Browser extension that finds legally-free versions of paywalled papers. A green button appears on the article page. Works far more often than people expect, because most authors post preprints.',
   'Academic papers'),
  ('arXiv', 'https://arxiv.org',
   'Preprints for CS, physics and maths. No account, no paywall.',
   'Academic papers'),
  ('DOAJ', 'https://doaj.org',
   'Directory of open-access journals across every field.',
   'Academic papers'),
  ('Semantic Scholar', 'https://www.semanticscholar.org',
   'Search papers, follow citations, and find free PDFs where they exist.',
   'Academic papers'),

  -- Courses
  ('freeCodeCamp', 'https://www.freecodecamp.org',
   'Full certification paths in web dev, data analysis and ML. Entirely free, no tier games.',
   'Courses'),
  ('MIT OpenCourseWare', 'https://ocw.mit.edu',
   'Actual MIT lectures, problem sets and exams. Best for theory-heavy subjects.',
   'Courses'),
  ('CS50', 'https://cs50.harvard.edu/x/',
   'Harvard''s intro to CS — the best there is anywhere, free to audit.',
   'Courses'),
  ('The Odin Project', 'https://www.theodinproject.com',
   'Full-stack curriculum, project-based the whole way through.',
   'Courses'),

  -- Books
  ('Project Gutenberg', 'https://www.gutenberg.org',
   '70,000+ public domain books. Everything pre-1929.',
   'Books'),
  ('Open Library', 'https://openlibrary.org',
   'Internet Archive''s lending programme — borrow in-copyright books legally, one copy at a time.',
   'Books'),
  ('Standard Ebooks', 'https://standardebooks.org',
   'Gutenberg texts, properly typeset. A much nicer reading experience.',
   'Books'),

  -- Software
  ('AlternativeTo', 'https://alternativeto.net',
   'Find free or open-source replacements for any paid tool. The most useful site on this list.',
   'Software'),
  ('Ninite', 'https://ninite.com',
   'Install a batch of free Windows apps in one go, with no bundled junk.',
   'Software'),
  ('F-Droid', 'https://f-droid.org',
   'Open-source Android app store.',
   'Software'),
  ('winget', 'https://learn.microsoft.com/windows/package-manager/',
   'Windows'' built-in command-line package manager.',
   'Software'),
  ('Chocolatey', 'https://chocolatey.org',
   'Command-line package manager for Windows.',
   'Software'),

  -- Free media
  ('Internet Archive', 'https://archive.org',
   'Public domain films, old software and live music recordings.',
   'Free media'),
  ('Tubi', 'https://tubitv.com',
   'Ad-supported and legal. Check availability in India before relying on it.',
   'Free media'),
  ('Pluto TV', 'https://pluto.tv',
   'Free ad-supported channels. Check availability in India before relying on it.',
   'Free media'),
  ('MX Player', 'https://www.mxplayer.in',
   'Free, ad-supported, and a decent catalogue in India.',
   'Free media'),
  ('Bandcamp', 'https://bandcamp.com',
   'Plenty of artists post free downloads. Also the platform where buying actually pays them.',
   'Free media'),

  -- Games
  ('Epic Games Store', 'https://store.epicgames.com',
   'A free game every week, yours permanently once claimed.',
   'Games'),
  ('itch.io', 'https://itch.io',
   'Huge library of free indie games, a lot of them excellent.',
   'Games'),
  ('GOG', 'https://www.gog.com',
   'DRM-free classics, with giveaways rotating regularly.',
   'Games'),

  -- Project assets
  ('Unsplash', 'https://unsplash.com',
   'Free stock photos, commercial use allowed.',
   'Project assets'),
  ('Pexels', 'https://www.pexels.com',
   'Free stock photos and video, commercial use allowed.',
   'Project assets'),
  ('Google Fonts', 'https://fonts.google.com',
   'Properly licensed fonts, no attribution headaches.',
   'Project assets'),
  ('Freesound', 'https://freesound.org',
   'Free sound effects, CC-licensed.',
   'Project assets'),
  ('Lucide', 'https://lucide.dev',
   'Free MIT-licensed icon set — the one this app is built with.',
   'Project assets'),
  ('Heroicons', 'https://heroicons.com',
   'Free MIT-licensed icons from the Tailwind team.',
   'Project assets'),

  -- Privacy & security
  ('Privacy Guides', 'https://www.privacyguides.org',
   'The actually-credible recommendations site. Not affiliate-driven.',
   'Privacy & security'),
  ('uBlock Origin', 'https://ublockorigin.com',
   'The adblocker. Not the others.',
   'Privacy & security'),
  ('Bitwarden', 'https://bitwarden.com',
   'Free password manager, open source.',
   'Privacy & security')
) as v(name, url, tagline, category)
where not exists (
  select 1 from showcase_items s
  where s.college_id = g.id and s.url = v.url
);
