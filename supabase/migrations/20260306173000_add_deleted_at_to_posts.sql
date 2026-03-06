-- Add deleted_at column to posts for soft delete tracking (lixeira)
ALTER TABLE public.posts
ADD COLUMN deleted_at timestamp with time zone;
