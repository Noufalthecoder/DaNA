-- 034: close a privacy leak found on the live database. Run after 033. Safe to re-run.
--
-- A signed-in couple member could read EVERY row of accounts, people and couples (names, roles, emails,
-- who is with whom). The rules in schema.sql were correct; extra permissive read rules had been added
-- on the live database outside these files. This removes every read rule on the three tables and puts
-- back only the intended ones:
--   accounts  your own row; counsellors and DoH admins see all (they manage people)
--   people    yourself and your linked partner; counsellors and admins see all
--   couples   your own couple; counsellors and admins see all
-- Partner search, connection requests, accept, unlink and block all run through security-definer
-- functions (find_partner, my_connection_requests, ...), so they keep working.

do $$
declare r record;
begin
  for r in select policyname, tablename from pg_policies
           where schemaname = 'public' and tablename in ('accounts', 'people', 'couples')
             and cmd in ('SELECT', 'ALL')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;

alter table accounts enable row level security;
alter table people   enable row level security;
alter table couples  enable row level security;

create policy accounts_read on accounts for select to authenticated
  using (user_id = auth.uid() or my_role() in ('counsellor', 'admin'));

create policy people_read on people for select to authenticated
  using (id in (my_person(), my_partner()) or my_role() in ('counsellor', 'admin'));

create policy couples_read on couples for select to authenticated
  using (id = my_couple() or my_role() in ('counsellor', 'admin'));

-- writes the app makes directly: only on your own row, and only harmless columns
-- (role, person_id and scope can never be changed by the person; staff roles go through the staff-code function)
drop policy if exists accounts_update_own on accounts;
create policy accounts_update_own on accounts for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
revoke update on accounts from authenticated, anon;
grant update (display_name, dana_id, title) on accounts to authenticated;

drop policy if exists people_update_own on people;
create policy people_update_own on people for update to authenticated
  using (id = my_person()) with check (id = my_person());
revoke update on people from authenticated, anon;
grant update (intake_completed_at, uaepass_linked_at, uaepass_via) on people to authenticated;

-- couples are only ever changed through the linking functions
revoke insert, update, delete on couples from authenticated, anon;

-- nobody signed out may read them at all
revoke select on accounts, people, couples from anon;
