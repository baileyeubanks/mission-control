-- Root OS Canonical Schema
-- This defines the state machine and data model for the 3-sided operational ERP.

-- 1. Custom Types (Enums)
CREATE TYPE user_role AS ENUM ('owner', 'admin', 'operator', 'crew', 'client');
CREATE TYPE job_state AS ENUM ('lead', 'quoted', 'scheduled', 'in_progress', 'completed', 'invoiced', 'paid', 'cancelled');
CREATE TYPE message_channel AS ENUM ('sms', 'email', 'internal_note');

-- 2. Profiles (Extends Supabase Auth)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT NOT NULL,
  display_name TEXT,
  role user_role DEFAULT 'client'::user_role NOT NULL,
  phone_number TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Jobs (The Core State Machine)
CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES profiles(id),
  crew_id UUID REFERENCES profiles(id), -- Assigned crew member
  title TEXT NOT NULL,
  description TEXT,
  state job_state DEFAULT 'lead'::job_state NOT NULL,
  scheduled_start TIMESTAMPTZ,
  scheduled_end TIMESTAMPTZ,
  actual_start TIMESTAMPTZ,
  actual_end TIMESTAMPTZ,
  price_cents INTEGER,
  access_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Messages (Unified Inbox & Audit Trail)
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id),
  sender_id UUID REFERENCES profiles(id), -- NULL if system generated
  channel message_channel NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Proofs (Photos/Signatures)
CREATE TABLE proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) NOT NULL,
  uploaded_by UUID REFERENCES profiles(id) NOT NULL,
  storage_path TEXT NOT NULL,
  proof_type TEXT NOT NULL, -- 'before_photo', 'after_photo', 'signature'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. System Logs (Operational Stream)
CREATE TABLE system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL,
  detail TEXT,
  status TEXT DEFAULT 'info', -- 'info', 'success', 'warning', 'error'
  authority TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Row Level Security (RLS) Policies

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE proofs ENABLE ROW LEVEL SECURITY;

-- Profiles: Users can read their own. Admins/Owners can read all.
CREATE POLICY "Users can view own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Admins can view all profiles" ON profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner'))
);

-- Jobs: Clients see their jobs. Crew sees assigned jobs. Admins see all.
CREATE POLICY "Clients view own jobs" ON jobs FOR SELECT USING (client_id = auth.uid());
CREATE POLICY "Crew view assigned jobs" ON jobs FOR SELECT USING (crew_id = auth.uid());
CREATE POLICY "Admins view all jobs" ON jobs FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'operator'))
);
-- Crew can update job state (e.g., mark in_progress or completed)
CREATE POLICY "Crew can update assigned jobs" ON jobs FOR UPDATE USING (crew_id = auth.uid());

-- Messages: Clients see public messages for their jobs. Crew sees public + internal for assigned. Admins see all.
CREATE POLICY "Admins view all messages" ON messages FOR SELECT USING (
  EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'owner', 'operator'))
);

-- 7. Triggers
-- Auto-create profile on auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, role)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', 'client');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
