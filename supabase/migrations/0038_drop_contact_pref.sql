-- 0038: finish the WhatsApp-number removal — drop profiles.contact_pref.
-- Deferred from 0037: dropping it while the old build still `select`ed the
-- column 404'd every listing/post detail page ("Nothing here"). Safe now that
-- prod runs the 0037 privacy build (verified live 2026-07-13: no code path
-- selects contact_pref). Column was re-added nullable/null in the interim.
alter table profiles drop column if exists contact_pref;
