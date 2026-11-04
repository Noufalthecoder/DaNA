-- Run this AFTER schema.sql (SQL Editor -> New query -> Run).
-- Lets a brand-new user (email sign-up or Google) create their own account row.
-- They always start as a couple member with no results linked; nobody can make
-- themselves a counsellor or DoH admin.
create policy accounts_self_signup on accounts for insert to authenticated
  with check (user_id = auth.uid() and role = 'couple' and person_id is null);
