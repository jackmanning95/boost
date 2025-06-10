/*
  # Campaign Management Tables

  1. New Tables
    - `campaigns`
      - `id` (text, primary key)
      - `name` (text)
      - `client_id` (uuid, references auth.users)
      - `audiences` (jsonb)
      - `platforms` (jsonb)
      - `budget` (numeric)
      - `start_date` (date)
      - `end_date` (date)
      - `status` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

    - `audience_requests`
      - `id` (text, primary key)
      - `campaign_id` (text, references campaigns)
      - `client_id` (uuid, references auth.users)
      - `audiences` (jsonb)
      - `platforms` (jsonb)
      - `budget` (numeric)
      - `start_date` (date)
      - `end_date` (date)
      - `notes` (text)
      - `status` (text)
      - `created_at` (timestamptz)

    - `advertiser_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, references auth.users)
      - `platform` (text)
      - `advertiser_name` (text)
      - `advertiser_id` (text)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Add policies for authenticated users
*/

-- Create campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id text PRIMARY KEY,
  name text NOT NULL,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audiences jsonb DEFAULT '[]'::jsonb,
  platforms jsonb DEFAULT '{"social": [], "programmatic": []}'::jsonb,
  budget numeric(10,2) DEFAULT 0,
  start_date date,
  end_date date,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'completed'))
);

-- Create audience_requests table
CREATE TABLE IF NOT EXISTS audience_requests (
  id text PRIMARY KEY,
  campaign_id text REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  audiences jsonb DEFAULT '[]'::jsonb,
  platforms jsonb DEFAULT '{"social": [], "programmatic": []}'::jsonb,
  budget numeric(10,2) DEFAULT 0,
  start_date date,
  end_date date,
  notes text,
  status text DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  CONSTRAINT valid_status CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected'))
);

-- Create advertiser_accounts table
CREATE TABLE IF NOT EXISTS advertiser_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  advertiser_name text NOT NULL,
  advertiser_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, platform, advertiser_id)
);

-- Enable RLS
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE audience_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE advertiser_accounts ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Users can view own campaigns"
  ON campaigns
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own campaigns"
  ON campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Users can update own campaigns"
  ON campaigns
  FOR UPDATE
  TO authenticated
  USING (client_id = auth.uid())
  WITH CHECK (client_id = auth.uid());

-- Audience requests policies
CREATE POLICY "Users can view own requests or all requests if admin"
  ON audience_requests
  FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid() OR 
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Users can insert own requests"
  ON audience_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (client_id = auth.uid());

CREATE POLICY "Admins can update any request"
  ON audience_requests
  FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Advertiser accounts policies
CREATE POLICY "Users can view own advertiser accounts"
  ON advertiser_accounts
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own advertiser accounts"
  ON advertiser_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own advertiser accounts"
  ON advertiser_accounts
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own advertiser accounts"
  ON advertiser_accounts
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add updated_at triggers
CREATE TRIGGER update_campaigns_updated_at
  BEFORE UPDATE ON campaigns
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_advertiser_accounts_updated_at
  BEFORE UPDATE ON advertiser_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();