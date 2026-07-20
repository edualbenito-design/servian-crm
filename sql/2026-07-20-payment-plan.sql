-- Expected payment schedule per accepted quote: a jsonb array of tentative
-- installments [{id, label, expectedDate, amount}]. Lets "overdue" fire only
-- once a planned date has passed, and feeds cash-flow forecasts. Nullable and
-- read resiliently (absent = no plan), so the app runs fine before this is applied.

alter table quotes add column if not exists payment_plan jsonb;
