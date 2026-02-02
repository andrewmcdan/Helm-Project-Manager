CREATE TABLE IF NOT EXISTS effort_entries (
    id BIGSERIAL PRIMARY KEY,
    project_id BIGINT NOT NULL REFERENCES project_settings(id) ON DELETE CASCADE,
    requirement_id BIGINT NULL REFERENCES requirements(id) ON DELETE SET NULL,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    entry_date DATE,
    effort_mode TEXT NOT NULL CHECK (effort_mode IN ('Hourly','Daily','Weekly')),
    effort_amount NUMERIC(6,2) NOT NULL,
    description TEXT NULL,
    week_of DATE,
    category TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ NULL,
    archived_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_effort_entries_project ON effort_entries(project_id);
CREATE INDEX IF NOT EXISTS idx_effort_entries_requirement ON effort_entries(requirement_id);
CREATE INDEX IF NOT EXISTS idx_effort_entries_user ON effort_entries(user_id);
CREATE INDEX IF NOT EXISTS idx_effort_entries_entry_date ON effort_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_effort_entries_week_of ON effort_entries(week_of);

CREATE OR REPLACE FUNCTION update_effort_entries_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;    

CREATE OR REPLACE TRIGGER trg_update_effort_entries_timestamp
BEFORE UPDATE ON effort_entries
FOR EACH ROW
EXECUTE FUNCTION update_effort_entries_timestamp();

CREATE TABLE IF NOT EXISTS effort_categories (
    id BIGSERIAL PRIMARY KEY,
    category_name TEXT NOT NULL,
    sort_order INT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_effort_categories_name ON effort_categories(category_name);
CREATE UNIQUE INDEX IF NOT EXISTS idx_effort_categories_sort_order ON effort_categories(sort_order);