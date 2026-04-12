-- Add resolved_at timestamp to tickets
alter table public.tickets
  add column if not exists resolved_at timestamp,
  add column if not exists admin_note text,
  add column if not exists assigned_workers text,
  add column if not exists is_read_by_student boolean default false,
  add column if not exists last_status_seen text;

-- Notifications table
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  ticket_id bigint,
  tracking_code text,
  nom text,
  message_student text,
  message_admin text,
  type text, -- 'new_ticket' | 'status_update'
  read_by_admin boolean default false,
  created_at timestamp default now()
);
