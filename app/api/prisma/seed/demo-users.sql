-- BrewLite demo accounts — LOCAL / TEST / CLASSROOM DEMO ONLY.
-- DO NOT run on production: both accounts share the public sample password documented in README.
-- Load with: npm run db:seed:demo   (runs the catalog seed first, then this file)
-- Production: register a normal account, then promote it with a one-off SQL UPDATE (see docs/deployment.md).
BEGIN;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM public.users WHERE role = 'admin' AND email NOT LIKE '%@brewlite.local') THEN
   RAISE EXCEPTION 'demo-users.sql refused: this database already has a real admin account (looks like production).';
 END IF;
END $$;
INSERT INTO public.users (user_id,name,phone,password,point,email,role) VALUES
('c4444444-4444-4444-8444-000000000001','BrewLite Admin','0900000000','$2b$10$/3KJjEKSc9o0eGkUyU8tzepce08qT44m7K4zd1pzpxYdmmkCc3QQC',0,'admin@brewlite.local','admin'),
('c4444444-4444-4444-8444-000000000002','Demo Customer','0900000001','$2b$10$/3KJjEKSc9o0eGkUyU8tzepce08qT44m7K4zd1pzpxYdmmkCc3QQC',0,'demo@brewlite.local','customer')
ON CONFLICT(user_id) DO NOTHING;

COMMIT;
