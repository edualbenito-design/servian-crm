-- Follow-up note: a short reminder saved alongside the next follow-up date
-- (e.g. "message on the 28th — that's their payday"). Shown on the client
-- page and in the Follow-up Calendar. Optional; the app saves the date even
-- if this column is missing (resilient write in updateFollowUp).
alter table public.clients add column if not exists follow_up_note text;
