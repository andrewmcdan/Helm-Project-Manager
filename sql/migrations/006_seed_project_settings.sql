INSERT INTO project_settings (
    project_name,
    project_owner_name,
    project_description,
    project_owner_email,
    project_status,
    effort_default_mode,
    week_start_day,
    effort_rounding
) VALUES (
    'Helm',
    'Project Owner',
    'A web-based project management system for tracking requirements, effort, and risks.',
    NULL,
    'Active',
    'Daily',
    'Monday',
    0.25
) ON CONFLICT (project_name) DO NOTHING;
