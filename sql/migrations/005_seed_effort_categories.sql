INSERT INTO effort_categories (category_name, sort_order) VALUES
    ('Requirements Analysis', 1),
    ('Design', 2),
    ('Coding', 3),
    ('Testing', 4),
    ('Project Management', 5)
ON CONFLICT (category_name) DO NOTHING;
