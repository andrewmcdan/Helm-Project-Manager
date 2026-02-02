CREATE TABLE IF NOT EXISTS risks (
    id BIGSERIAL PRIMARY KEY,
    risk_code TEXT NOT NULL UNIQUE,
    risk_title TEXT NOT NULL,
    risk_description TEXT NULL,
    risk_likelihood TEXT NOT NULL CHECK (risk_likelihood IN ('Low','Medium','High','Critical')),
    risk_impact TEXT NOT NULL CHECK (risk_impact IN ('Low','Medium','High','Critical')),
    risk_status TEXT NOT NULL CHECK (risk_status IN ('Identified','Analyzed','Mitigated','Closed')),
    owner_id BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    mitigation_plan TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    archived_at TIMESTAMPTZ NULL,
    archived_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL,
    archived BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_risks_status ON risks(risk_status);
CREATE INDEX IF NOT EXISTS idx_risks_owner ON risks(owner_id);
CREATE OR REPLACE FUNCTION update_risks_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_update_risks_timestamp
BEFORE UPDATE ON risks
FOR EACH ROW
EXECUTE FUNCTION update_risks_timestamp();

CREATE TABLE IF NOT EXISTS risk_updates (
    id BIGSERIAL PRIMARY KEY,
    risk_id BIGINT NOT NULL REFERENCES risks(id) ON DELETE CASCADE,
    update_type TEXT NOT NULL CHECK (update_type IN ('Status Change','Mitigation Update','Owner Change','General Update')),
    status TEXT NULL CHECK (status IN ('Identified','Analyzed','Mitigated','Closed')),
    note TEXT NULL,
    update_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by BIGINT NULL REFERENCES users(id) ON DELETE SET NULL
);