-- Run this in Supabase SQL Editor
-- Create notifications table for persistent notification history

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
  patient_email TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT now(),
  read BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_notifications_patient_email ON notifications(patient_email);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(patient_email, read);

-- Enable RLS (Row Level Security)
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: patients can only see their own notifications
CREATE POLICY "Patients can read own notifications"
  ON notifications FOR SELECT
  USING (patient_email = auth.jwt() ->> 'email');

CREATE POLICY "Patients can insert own notifications"
  ON notifications FOR INSERT
  WITH CHECK (patient_email = auth.jwt() ->> 'email');

CREATE POLICY "Patients can update own notifications"
  ON notifications FOR UPDATE
  USING (patient_email = auth.jwt() ->> 'email');

DROP POLICY IF EXISTS "Patients can delete own notifications" ON notifications;
CREATE POLICY "Patients can delete own notifications"
  ON notifications FOR DELETE
  USING (patient_email = auth.jwt() ->> 'email');

-- Also allow service role (for admin writes)
CREATE POLICY "Service role full access"
  ON notifications FOR ALL
  USING (auth.role() = 'service_role');
