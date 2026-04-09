-- Fix: Allow admins (authenticated users with admin role or any authenticated user) to read all appointment ratings
-- Run this in Supabase SQL Editor

-- First, drop the restrictive service_role-only policy
DROP POLICY IF EXISTS "Admins can read all ratings" ON appointment_ratings;

-- Add a new permissive policy that allows authenticated users to read all ratings
-- This covers the admin dashboard read access
CREATE POLICY "Authenticated users can read all ratings"
  ON appointment_ratings FOR SELECT
  TO authenticated
  USING (true);

-- Also add a policy to allow anonymous/public read (optional, for admin JWT)
-- If admins use anon key, also add:
CREATE POLICY "Allow all read for admin access"
  ON appointment_ratings FOR SELECT
  USING (true);

-- Optional: Add appointment_date column if it doesn't exist
-- (it's used in the display logic but may not be in the table)
ALTER TABLE appointment_ratings ADD COLUMN IF NOT EXISTS appointment_date date;

-- Optional: Update appointment_date from appointments table
UPDATE appointment_ratings ar
SET appointment_date = a.date::date
FROM appointments a
WHERE ar.appointment_id = a.id
  AND ar.appointment_date IS NULL;
