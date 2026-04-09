DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'unique_email'
      AND conrelid = 'public.patients'::regclass
  ) THEN
    ALTER TABLE public.patients
    ADD CONSTRAINT unique_email UNIQUE (email);
  END IF;
END $$;
