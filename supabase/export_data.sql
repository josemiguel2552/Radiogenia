-- ============================================================
-- RUN THIS IN FRANKFURT SQL EDITOR
-- Copy the ENTIRE result and paste it in Brazil SQL Editor
-- ============================================================

-- 1. Export auth.users
SELECT 'INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token, recovery_token, email_change_token_new, email_change)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(instance_id) || ', '
  || quote_literal(email) || ', '
  || quote_literal(encrypted_password) || ', '
  || COALESCE(quote_literal(email_confirmed_at::text), 'NULL') || ', '
  || quote_literal(raw_app_meta_data::text) || '::jsonb, '
  || quote_literal(COALESCE(raw_user_meta_data::text, '{}')) || '::jsonb, '
  || quote_literal(created_at::text) || ', '
  || quote_literal(updated_at::text) || ', '
  || quote_literal(role) || ', '
  || quote_literal(aud) || ', '
  || quote_literal(COALESCE(confirmation_token, '')) || ', '
  || quote_literal(COALESCE(recovery_token, '')) || ', '
  || quote_literal(COALESCE(email_change_token_new, '')) || ', '
  || quote_literal(COALESCE(email_change, ''))
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM auth.users;

-- 2. Export profiles
SELECT 'INSERT INTO profiles (id, email, name, subscription_status, role, subscription_plan, reports_used_this_month, billing_period_start, stripe_customer_id, stripe_subscription_id, dictation_seconds_used, approved, created_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(email) || ', '
  || COALESCE(quote_literal(name), 'NULL') || ', '
  || COALESCE(quote_literal(subscription_status), '''free''') || ', '
  || quote_literal(role) || ', '
  || quote_literal(subscription_plan) || ', '
  || reports_used_this_month || ', '
  || quote_literal(billing_period_start::text) || ', '
  || COALESCE(quote_literal(stripe_customer_id), 'NULL') || ', '
  || COALESCE(quote_literal(stripe_subscription_id), 'NULL') || ', '
  || dictation_seconds_used || ', '
  || COALESCE(approved::text, 'false') || ', '
  || quote_literal(created_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM profiles;

-- 3. Export user_model_config
SELECT 'INSERT INTO user_model_config (id, user_id, provider, model_name, api_key_encrypted, custom_base_url, findings_length, normal_fields_verbosity, paraphrase_level, output_language, style_learning_enabled, style_sample_count, few_shot_count, created_at, updated_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || quote_literal(provider) || ', '
  || quote_literal(model_name) || ', '
  || COALESCE(quote_literal(api_key_encrypted), '''') || ', '
  || COALESCE(quote_literal(custom_base_url), '''') || ', '
  || quote_literal(findings_length) || ', '
  || quote_literal(normal_fields_verbosity) || ', '
  || quote_literal(paraphrase_level) || ', '
  || quote_literal(output_language) || ', '
  || style_learning_enabled || ', '
  || style_sample_count || ', '
  || few_shot_count || ', '
  || quote_literal(created_at::text) || ', '
  || quote_literal(updated_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM user_model_config;

-- 4. Export global_model_config
SELECT 'INSERT INTO global_model_config (id, provider, model_name, api_key_encrypted, custom_base_url, whisper_api_key_encrypted, findings_provider, findings_model, conclusion_provider, conclusion_model, recommendations_provider, recommendations_model, trace_provider, trace_model, anthropic_api_key_encrypted, google_api_key_encrypted, deepseek_api_key_encrypted, custom_api_key_encrypted, dictation_correction_provider, dictation_correction_model, improve_writing_provider, improve_writing_model, updated_at)
VALUES ('
  || quote_literal(id) || ', '
  || COALESCE(quote_literal(provider), '''deepseek''') || ', '
  || COALESCE(quote_literal(model_name), '''deepseek-chat''') || ', '
  || COALESCE(quote_literal(api_key_encrypted), '''') || ', '
  || COALESCE(quote_literal(custom_base_url), '''') || ', '
  || COALESCE(quote_literal(whisper_api_key_encrypted), '''') || ', '
  || COALESCE(quote_literal(findings_provider), 'NULL') || ', '
  || COALESCE(quote_literal(findings_model), 'NULL') || ', '
  || COALESCE(quote_literal(conclusion_provider), 'NULL') || ', '
  || COALESCE(quote_literal(conclusion_model), 'NULL') || ', '
  || COALESCE(quote_literal(recommendations_provider), 'NULL') || ', '
  || COALESCE(quote_literal(recommendations_model), 'NULL') || ', '
  || COALESCE(quote_literal(trace_provider), 'NULL') || ', '
  || COALESCE(quote_literal(trace_model), 'NULL') || ', '
  || COALESCE(quote_literal(anthropic_api_key_encrypted), 'NULL') || ', '
  || COALESCE(quote_literal(google_api_key_encrypted), 'NULL') || ', '
  || COALESCE(quote_literal(deepseek_api_key_encrypted), 'NULL') || ', '
  || COALESCE(quote_literal(custom_api_key_encrypted), 'NULL') || ', '
  || COALESCE(quote_literal(dictation_correction_provider), 'NULL') || ', '
  || COALESCE(quote_literal(dictation_correction_model), 'NULL') || ', '
  || COALESCE(quote_literal(improve_writing_provider), 'NULL') || ', '
  || COALESCE(quote_literal(improve_writing_model), 'NULL') || ', '
  || quote_literal(updated_at::text)
  || ');'
AS sql_statement
FROM global_model_config;

-- 5. Export global_templates
SELECT 'INSERT INTO global_templates (id, name, modality, base_template_id, structure, is_active, created_at, updated_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(name) || ', '
  || quote_literal(modality) || ', '
  || COALESCE(base_template_id::text, 'NULL') || ', '
  || quote_literal(structure::text) || '::jsonb, '
  || is_active || ', '
  || quote_literal(created_at::text) || ', '
  || quote_literal(updated_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM global_templates;

-- 6. Export reports
SELECT 'INSERT INTO reports (id, user_id, study_type, modality, contrast_option, raw_dictation, findings_text, conclusion_text, recommendations_text, template_snapshot, model_config_snapshot, initial_findings_text, initial_conclusion_text, clinical_context, generation_duration_ms, provider_used, model_used, had_corrections, error_reported, error_report_note, created_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || quote_literal(study_type) || ', '
  || quote_literal(modality) || ', '
  || COALESCE(quote_literal(contrast_option), '''default''') || ', '
  || COALESCE(quote_literal(raw_dictation), '''') || ', '
  || COALESCE(quote_literal(findings_text), '''') || ', '
  || COALESCE(quote_literal(conclusion_text), '''') || ', '
  || COALESCE(quote_literal(recommendations_text), '''') || ', '
  || COALESCE(quote_literal(template_snapshot::text) || '::jsonb', 'NULL') || ', '
  || COALESCE(quote_literal(model_config_snapshot::text) || '::jsonb', 'NULL') || ', '
  || COALESCE(quote_literal(initial_findings_text), 'NULL') || ', '
  || COALESCE(quote_literal(initial_conclusion_text), 'NULL') || ', '
  || COALESCE(quote_literal(clinical_context), '''') || ', '
  || COALESCE(generation_duration_ms::text, 'NULL') || ', '
  || COALESCE(quote_literal(provider_used), 'NULL') || ', '
  || COALESCE(quote_literal(model_used), 'NULL') || ', '
  || COALESCE(had_corrections::text, 'false') || ', '
  || COALESCE(error_reported::text, 'false') || ', '
  || COALESCE(quote_literal(error_report_note), 'NULL') || ', '
  || quote_literal(created_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM reports;

-- 7. Export user_templates
SELECT 'INSERT INTO user_templates (id, user_id, name, modality, base_template_id, structure, is_default, created_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || quote_literal(name) || ', '
  || quote_literal(modality) || ', '
  || COALESCE(base_template_id::text, 'NULL') || ', '
  || quote_literal(structure::text) || '::jsonb, '
  || is_default || ', '
  || quote_literal(created_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM user_templates;

-- 8. Export user_recommendations
SELECT 'INSERT INTO user_recommendations (id, user_id, trigger_keyword, recommendation_text, source, guideline_name, created_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || quote_literal(trigger_keyword) || ', '
  || quote_literal(recommendation_text) || ', '
  || quote_literal(source) || ', '
  || COALESCE(quote_literal(guideline_name), '''') || ', '
  || quote_literal(created_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM user_recommendations;

-- 9. Export signatures
SELECT 'INSERT INTO signatures (id, user_id, label, body, is_active, created_at, updated_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || quote_literal(label) || ', '
  || quote_literal(body) || ', '
  || is_active || ', '
  || quote_literal(created_at::text) || ', '
  || quote_literal(updated_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM signatures;

-- 10. Export style_samples
SELECT 'INSERT INTO style_samples (id, user_id, report_id, findings_text, conclusion_text, modality, study_type, created_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || COALESCE(quote_literal(report_id), 'NULL') || ', '
  || quote_literal(findings_text) || ', '
  || COALESCE(quote_literal(conclusion_text), '''') || ', '
  || quote_literal(modality) || ', '
  || quote_literal(study_type) || ', '
  || quote_literal(created_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM style_samples;

-- 11. Export style_patterns
SELECT 'INSERT INTO style_patterns (id, user_id, modality, study_type, kind, label, phrase, frequency, last_seen_at, created_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || quote_literal(modality) || ', '
  || quote_literal(study_type) || ', '
  || quote_literal(kind) || ', '
  || COALESCE(quote_literal(label), 'NULL') || ', '
  || quote_literal(phrase) || ', '
  || frequency || ', '
  || quote_literal(last_seen_at::text) || ', '
  || quote_literal(created_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM style_patterns;

-- 12. Export normality_phrases
SELECT 'INSERT INTO normality_phrases (id, user_id, modality, section_label, phrase, created_at, updated_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || quote_literal(modality) || ', '
  || quote_literal(section_label) || ', '
  || quote_literal(phrase) || ', '
  || quote_literal(created_at::text) || ', '
  || quote_literal(updated_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM normality_phrases;

-- 13. Export audit_logs
SELECT 'INSERT INTO audit_logs (id, user_id, report_id, action, provider, model, duration_ms, had_corrections, metadata, created_at)
VALUES ('
  || quote_literal(id) || ', '
  || quote_literal(user_id) || ', '
  || COALESCE(quote_literal(report_id), 'NULL') || ', '
  || quote_literal(action) || ', '
  || COALESCE(quote_literal(provider), 'NULL') || ', '
  || COALESCE(quote_literal(model), 'NULL') || ', '
  || COALESCE(duration_ms::text, 'NULL') || ', '
  || COALESCE(had_corrections::text, 'false') || ', '
  || COALESCE(quote_literal(metadata::text) || '::jsonb', '''{}''::jsonb') || ', '
  || quote_literal(created_at::text)
  || ') ON CONFLICT (id) DO NOTHING;'
AS sql_statement
FROM audit_logs;
