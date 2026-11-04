-- =====================================================================
-- Show each user's email in public.accounts (visible in Table Editor).
-- Run AFTER 005_booking.sql. SQL Editor -> New query -> Run. Safe to re-run.
-- The email stays owned by auth.users; this column is a read-only copy kept
-- in step automatically. Privacy: accounts_read already limits rows to the
-- user themselves and staff. Health tables still never hold emails.
-- =====================================================================
alter table accounts add column if not exists email text;

-- fill it for everyone who already has an account
update accounts a set email = u.email
from auth.users u where u.id = a.user_id and a.email is distinct from u.email;

-- new account rows: copy the email from the login
create or replace function accounts_set_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.email := (select email from auth.users where id = new.user_id);
  return new;
end $$;

drop trigger if exists accounts_email_on_insert on accounts;
create trigger accounts_email_on_insert before insert or update of user_id on accounts
for each row execute function accounts_set_email();

-- a user changes their email: update the copy
create or replace function sync_account_email() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.accounts set email = new.email where user_id = new.id;
  return new;
end $$;

drop trigger if exists on_auth_email_change on auth.users;
create trigger on_auth_email_change after update of email on auth.users
for each row execute function sync_account_email();

-- the copy can't be faked from the app: block direct edits of the column
revoke update (email) on accounts from authenticated, anon;
