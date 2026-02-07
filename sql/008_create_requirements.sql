CREATE TABLE IF NOT EXISTS requirements (
    id BIGSERIAL PRIMARY KEY,
    requirement_code_prefix TEXT NOT NULL,
    requirement_code_number INTEGER NOT NULL,
    project_id BIGINT NULL REFERENCES project_settings(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT NULL,
    requirement_type TEXT NOT NULL CHECK (requirement_type IN ('Functional','Non-functional')),
    priority TEXT NOT NULL CHECK (priority IN ('Low','Medium','High','Critical')),
    status TEXT NOT NULL CHECK (status IN ('Proposed','Approved','In Development','Completed','Rejected')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ NULL,
    archived_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_requirements_project ON requirements(project_id);
CREATE INDEX IF NOT EXISTS idx_requirements_status ON requirements(status);
CREATE INDEX IF NOT EXISTS idx_requirements_priority ON requirements(priority);
CREATE INDEX IF NOT EXISTS idx_requirements_type ON requirements(requirement_type);
CREATE INDEX IF NOT EXISTS idx_requirements_created_by ON requirements(created_by);
CREATE INDEX IF NOT EXISTS idx_requirements_updated_by ON requirements(updated_by);
CREATE INDEX IF NOT EXISTS idx_requirements_archived_by ON requirements(archived_by);
CREATE OR REPLACE FUNCTION update_requirements_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE OR REPLACE TRIGGER trg_update_requirements_timestamp
BEFORE UPDATE ON requirements
FOR EACH ROW
EXECUTE FUNCTION update_requirements_timestamp();

CREATE TABLE IF NOT EXISTS requirements_acceptance_criteria (
    id BIGSERIAL PRIMARY KEY,
    requirement_id BIGINT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    criteria_text TEXT NOT NULL,
    is_met BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_acceptance_criteria_requirement ON requirements_acceptance_criteria(requirement_id);
CREATE OR REPLACE FUNCTION update_acceptance_criteria_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;    

CREATE OR REPLACE TRIGGER trg_update_acceptance_criteria_timestamp
BEFORE UPDATE ON requirements_acceptance_criteria
FOR EACH ROW
EXECUTE FUNCTION update_acceptance_criteria_timestamp();    

CREATE TABLE If NOT EXISTS requirements_tags (
    id BIGSERIAL PRIMARY KEY,
    tag TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_requirements_tags_tag ON requirements_tags(tag);

-- Junction table for many-to-many relationship between requirements and tags
CREATE TABLE IF NOT EXISTS requirements_tags_junction (
    requirement_id BIGINT NOT NULL REFERENCES requirements(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES requirements_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (requirement_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_requirements_tags_junction_requirement ON requirements_tags_junction(requirement_id);
CREATE INDEX IF NOT EXISTS idx_requirements_tags_junction_tag ON requirements_tags_junction(tag_id);

CREATE TABLE IF NOT EXISTS requirements_tags_project_settings_junction (
    project_settings_id BIGINT NOT NULL REFERENCES project_settings(id) ON DELETE CASCADE,
    tag_id BIGINT NOT NULL REFERENCES requirements_tags(id) ON DELETE CASCADE,
    PRIMARY KEY (project_settings_id, tag_id)
);