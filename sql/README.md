

## DB-Structure

### public.app_logs
- id: bigint
- user_id: bigint
- level: text
- message: text
- context: text
- source: text
- created_at: timestamp with time zone

### public.audit_logs
- id: bigint
- event_type: text
- user_id: bigint
- entity_type: text
- entity_id: bigint
- change_details: jsonb
- metadata: jsonb
- created_at: timestamp with time zone

### public.effort_categories
- id: bigint
- category_name: text
- sort_order: integer

### public.effort_entries
- id: bigint
- project_id: bigint
- requirement_id: bigint
- user_id: bigint
- entry_date: date
- effort_mode: text
- effort_amount: numeric
- description: text
- week_of: date
- category: text
- created_at: timestamp with time zone
- created_by: bigint
- updated_at: timestamp with time zone
- updated_by: bigint
- archived_at: timestamp with time zone
- archived_by: bigint
- archived: boolean

### public.logged_in_users
- id: bigint
- user_id: bigint
- token: text
- login_at: timestamp with time zone
- logout_at: timestamp with time zone

### public.password_expiry_email_tracking
- id: bigint
- user_id: bigint
- email_sent_at: timestamp with time zone
- email_sent_date: date
- password_expires_at: timestamp with time zone

### public.password_history
- id: bigint
- user_id: bigint
- password_hash: text
- changed_at: timestamp with time zone

### public.project_settings
- id: bigint
- project_name: text
- project_owner_name: text
- project_description: text
- project_owner_email: text
- project_status: text
- effort_default_mode: text
- week_start_day: text
- effort_rounding: numeric
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- updated_by: bigint
- archived: boolean
- archived_at: timestamp with time zone
- archived_by: bigint

### public.project_settings_change_log
- id: bigint
- project_settings_id: bigint
- changed_at: timestamp with time zone
- changed_by: bigint
- change_description: text
- changes: jsonb

### public.project_team_members
- id: bigint
- project_settings_id: bigint
- user_id: bigint
- role: text
- added_at: timestamp with time zone
- added_by: bigint

### public.requirements
- id: bigint
- requirement_code_prefix: text
- requirement_code_number: integer
- project_id: bigint
- title: text
- description: text
- requirement_type: text
- priority: text
- status: text
- created_at: timestamp with time zone
- created_by: bigint
- updated_at: timestamp with time zone
- updated_by: bigint
- archived_at: timestamp with time zone
- archived_by: bigint
- archived: boolean

### public.requirements_acceptance_criteria
- id: bigint
- requirement_id: bigint
- criteria_text: text
- is_met: boolean
- created_at: timestamp with time zone
- created_by: bigint
- updated_at: timestamp with time zone
- updated_by: bigint

### public.requirements_tags
- id: bigint
- tag: text
- created_at: timestamp with time zone
- created_by: bigint

### public.requirements_tags_junction
- requirement_id: bigint
- tag_id: bigint

### public.requirements_tags_project_settings_junction
- project_settings_id: bigint
- tag_id: bigint

### public.risk_updates
- id: bigint
- risk_id: bigint
- update_type: text
- status: text
- note: text
- update_date: timestamp with time zone
- updated_by: bigint

### public.risks
- id: bigint
- risk_code: text
- risk_title: text
- risk_description: text
- risk_likelihood: text
- risk_impact: text
- risk_status: text
- owner_id: bigint
- mitigation_plan: text
- created_at: timestamp with time zone
- created_by: bigint
- updated_at: timestamp with time zone
- updated_by: bigint
- archived_at: timestamp with time zone
- archived_by: bigint
- archived: boolean

### public.schema_migrations
- id: bigint
- filename: text
- applied_at: timestamp with time zone

### public.users
- id: bigint
- username: text
- email: text
- first_name: text
- last_name: text
- address: text
- date_of_birth: date
- role: text
- status: text
- password_hash: text
- password_changed_at: timestamp with time zone
- password_expires_at: timestamp with time zone
- failed_login_attempts: integer
- last_login_at: timestamp with time zone
- created_at: timestamp with time zone
- updated_at: timestamp with time zone
- security_question_1: text
- security_answer_hash_1: text
- security_question_2: text
- security_answer_hash_2: text
- security_question_3: text
- security_answer_hash_3: text
- reset_token: text
- reset_token_expires_at: timestamp with time zone
- suspension_end_at: timestamp with time zone
- suspension_start_at: timestamp with time zone
- temp_password: boolean
- user_icon_path: uuid
