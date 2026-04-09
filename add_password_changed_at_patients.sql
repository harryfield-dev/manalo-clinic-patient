ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;
