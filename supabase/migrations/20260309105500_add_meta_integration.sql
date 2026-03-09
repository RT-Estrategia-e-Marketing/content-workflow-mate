-- Add Meta API integration fields to clients table
ALTER TABLE public.clients
ADD COLUMN meta_access_token text,
ADD COLUMN meta_page_id text,
ADD COLUMN meta_page_name text,
ADD COLUMN meta_ig_account_id text,
ADD COLUMN meta_ig_account_name text;
