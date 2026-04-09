-- Create registration_attempts table for IP-based account creation rate limiting
CREATE TABLE IF NOT EXISTS registration_attempts (
  id uuid default gen_random_uuid() primary key,
  ip_address text not null,
  created_at timestamp default now()
);

-- Index for fast lookups by IP and timestamp
CREATE INDEX IF NOT EXISTS idx_registration_attempts_ip ON registration_attempts(ip_address);
CREATE INDEX IF NOT EXISTS idx_registration_attempts_created_at ON registration_attempts(created_at);

-- Optional: automatically clean up attempts older than 30 days (requires pg_cron or manual job)
-- This table does NOT need RLS since inserts happen via server-side logic or anon key
-- If you want to restrict direct client access, enable RLS and use a permissive insert policy:

ALTER TABLE registration_attempts ENABLE ROW LEVEL SECURITY;

-- Allow anonymous inserts (registration happens before login)
CREATE POLICY "Allow anonymous inserts to registration_attempts"
  ON registration_attempts
  FOR INSERT
  TO anon
  WITH CHECK (true);

-- Allow anonymous selects (needed for the count check)
CREATE POLICY "Allow anonymous selects on registration_attempts"
  ON registration_attempts
  FOR SELECT
  TO anon
  USING (true);
