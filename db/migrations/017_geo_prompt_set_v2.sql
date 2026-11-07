-- Nuove rilevazioni Gemini con il set v2 (32 domande); le scansioni passate conservano la loro versione.
alter table seo.geo_settings alter column prompt_set_version set default 'solair-geo-v2';
update seo.geo_settings set prompt_set_version='solair-geo-v2' where prompt_set_version='solair-grounded-comparison-v1';
