-- Launch hardening (2026-07-26): the gmail.com dev-seed college ("Demo College",
-- seeded in 0001) let ANY Gmail account sign up as a verified student. Unmap it
-- so only real college domains (vitstudent.ac.in) remain open for new signups.
--
-- Non-destructive + reversible: existing Demo College accounts keep working
-- (login re-checks nothing; only signup maps email domain -> college). To
-- re-enable Gmail for testing, set email_domain back to 'gmail.com'.
-- To add another real domain instead:
--   insert into colleges (name, email_domain) values ('<name>', '<domain>');
update colleges set email_domain = 'demo.invalid' where email_domain = 'gmail.com';
