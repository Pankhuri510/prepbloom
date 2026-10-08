-- Optional manual verification, AFTER schema.sql and after creating two test accounts.
-- In the SQL Editor inspect this query: RLS must be enabled for both tables.
select relname, relrowsecurity from pg_class
where oid in ('public.tracker_entries'::regclass, 'public.tracker_rewards'::regclass);

-- Authenticated users must have SELECT only on rewards (no direct INSERT/UPDATE/DELETE).
select table_name, privilege_type from information_schema.role_table_grants
where grantee = 'authenticated' and table_schema = 'public'
  and table_name in ('tracker_entries', 'tracker_rewards') order by table_name, privilege_type;

-- In the app: account A creates a note, account B signs in and must not see it.
-- Toggle an account's completed task repeatedly: its star balance must increase once.
-- Complete the same day's target simultaneously in two browsers: only one daily reward.
