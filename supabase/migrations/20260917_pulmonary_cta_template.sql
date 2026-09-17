-- Pulmonary CT angiography template (base_template_id 63): the three separate
-- artery fields become one "Pulmonary arteries", and "Right ventricle and
-- interventricular septum" becomes "Heart and pericardium".
--
-- src/lib/templates.ts already carries the new shape, but /api/seed only ever
-- INSERTS templates whose base_template_id is missing — it never updates one
-- that is already there. So the deployment is still serving the shape that was
-- seeded first, which is the old one. This migration is what actually changes
-- it for everyone.
--
-- The four field lines are replaced one at a time rather than swapping the
-- whole template text, so a copy someone reordered or added fields to keeps
-- those edits and loses only the four fields being retired.
--
-- Safe to run twice: the WHERE clauses match the retired field names, which
-- are gone after the first run.

-- The shared templates everyone sees.
UPDATE public.global_templates
SET structure = jsonb_set(
  structure,
  '{template}',
  to_jsonb(
    replace(
      replace(
        replace(
          replace(
            structure->>'template',
            '**Main pulmonary arteries**: {main pulmonary arteries}',
            '**Pulmonary arteries**: {pulmonary arteries}'
          ),
          E'\n**Lobar pulmonary arteries**: {lobar pulmonary arteries}',
          ''
        ),
        E'\n**Segmental and subsegmental arteries**: {segmental and subsegmental arteries}',
        ''
      ),
      '**Right ventricle and interventricular septum**: {right ventricle and interventricular septum}',
      '**Heart and pericardium**: {heart and pericardium}'
    )
  )
)
WHERE structure->>'template' LIKE '%{main pulmonary arteries}%'
   OR structure->>'template' LIKE '%{right ventricle and interventricular septum}%';

-- Personal copies people made of it.
UPDATE public.user_templates
SET structure = jsonb_set(
  structure,
  '{template}',
  to_jsonb(
    replace(
      replace(
        replace(
          replace(
            structure->>'template',
            '**Main pulmonary arteries**: {main pulmonary arteries}',
            '**Pulmonary arteries**: {pulmonary arteries}'
          ),
          E'\n**Lobar pulmonary arteries**: {lobar pulmonary arteries}',
          ''
        ),
        E'\n**Segmental and subsegmental arteries**: {segmental and subsegmental arteries}',
        ''
      ),
      '**Right ventricle and interventricular septum**: {right ventricle and interventricular septum}',
      '**Heart and pericardium**: {heart and pericardium}'
    )
  )
)
WHERE structure->>'template' LIKE '%{main pulmonary arteries}%'
   OR structure->>'template' LIKE '%{right ventricle and interventricular septum}%';

-- Per-user normality phrases for the retired fields. No template has these
-- labels any more, so the phrases can never be used for what they were written
-- for — but style learning still reads every stored phrase and would feed the
-- model sections that no longer exist. They go.
DELETE FROM public.normality_phrases
WHERE section_label IN (
  'Main pulmonary arteries',
  'Lobar pulmonary arteries',
  'Segmental and subsegmental arteries',
  'Right ventricle and interventricular septum'
);
