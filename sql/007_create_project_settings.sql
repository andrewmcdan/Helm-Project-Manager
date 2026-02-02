CREATE TABLE IF NOT EXISTS project_settings (
    id BIGSERIAL PRIMARY KEY,
    project_name TEXT NOT NULL UNIQUE,
    project_owner_name TEXT NULL,
    project_description TEXT NULL,
    project_owner_email TEXT NULL,
    project_status TEXT NOT NULL CHECK (project_status IN ('Planning','Active','Stabilizing','Complete', 'Archived')),
    effort_default_mode TEXT NOT NULL CHECK (effort_default_mode IN ('Hourly','Daily','Weekly')),
    week_start_day TEXT NOT NULL CHECK (week_start_day IN ('Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday')),
    effort_rounding NUMERIC(4,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE,
    archived_at TIMESTAMPTZ NULL,
    archived_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_project_settings_name ON project_settings(project_name);

CREATE OR REPLACE FUNCTION update_project_settings_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_project_settings_timestamp
BEFORE UPDATE ON project_settings
FOR EACH ROW
EXECUTE FUNCTION update_project_settings_timestamp();

CREATE TABLE IF NOT EXISTS project_settings_change_log (
    id BIGSERIAL PRIMARY KEY,
    project_settings_id BIGINT NOT NULL REFERENCES project_settings(id) ON DELETE CASCADE,
    changed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    changed_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    change_description TEXT NOT NULL,
    changes JSONB NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_project_settings_change_log_project ON project_settings_change_log(project_settings_id);