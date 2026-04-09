-- Create appointment_ratings table for patient feedback/review system
CREATE TABLE IF NOT EXISTS appointment_ratings (
  id uuid default gen_random_uuid() primary key,
  appointment_id uuid references appointments(id),
  patient_id uuid references patients(id),
  patient_email text not null,
  patient_name text not null,
  doctor_name text not null,
  rating int not null check (rating >= 1 and rating <= 5),
  review text,
  created_at timestamp default now()
);

-- Optional: index for fast lookup by appointment
CREATE INDEX IF NOT EXISTS idx_appointment_ratings_appointment_id ON appointment_ratings(appointment_id);

-- Optional: index for fast lookup by patient
CREATE INDEX IF NOT EXISTS idx_appointment_ratings_patient_email ON appointment_ratings(patient_email);

-- Enable Row Level Security (recommended)
ALTER TABLE appointment_ratings ENABLE ROW LEVEL SECURITY;

-- Policy: patients can insert their own ratings
CREATE POLICY "Patients can insert their own ratings"
  ON appointment_ratings FOR INSERT
  WITH CHECK (patient_email = auth.jwt() ->> 'email');

-- Policy: patients can read their own ratings
CREATE POLICY "Patients can read their own ratings"
  ON appointment_ratings FOR SELECT
  USING (patient_email = auth.jwt() ->> 'email');

-- Policy: service role can read all ratings (for admin)
CREATE POLICY "Admins can read all ratings"
  ON appointment_ratings FOR SELECT
  TO service_role
  USING (true);
