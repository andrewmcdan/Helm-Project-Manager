

## DB-Structure

### public.app_logs
- id: bigint
- user_id: bigint
- level: text
- message: text
- context: text
- source: text
- created_at: timestamp with time zone

### public.logged_in_users
- id: bigint
- user_id: bigint
- token: text
- login_at: timestamp with time zone
- logout_at: timestamp with time zone

### public.password_history
- id: bigint
- user_id: bigint
- password_hash: text
- changed_at: timestamp with time zone

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
