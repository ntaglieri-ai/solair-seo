-- Congela il contesto SEO usato per interpretare ogni rilevazione Gemini.
-- Le analisi storiche non cambiano quando arriva una nuova raccolta Google.
alter table seo.geo_scans add column seo_context jsonb;
