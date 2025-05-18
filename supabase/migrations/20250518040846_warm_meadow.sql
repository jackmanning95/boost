/*
  # Add advertiser accounts and notifications tables

  1. New Tables
    - `advertiser_accounts`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `platform` (text)
      - `advertiser_name` (text)
      - `advertiser_id` (text)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `notifications`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `title` (text)
      - `message` (text)
      - `read` (boolean)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to manage their own data
*/

-- Create advertiser_accounts table
CREATE TABLE IF NOT EXISTS advertiser_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  platform text NOT NULL,
  advertiser_name text NOT NULL,
  advertiser_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  message text NOT NULL,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE advertiser_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policies for advertiser_accounts
CREATE POLICY "Users can read own advertiser accounts"
  ON advertiser_accounts
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own advertiser accounts"
  ON advertiser_accounts
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own advertiser accounts"
  ON advertiser_accounts
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own advertiser accounts"
  ON advertiser_accounts
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Policies for notifications
CREATE POLICY "Users can read own notifications"
  ON notifications
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Add updated_at trigger for advertiser_accounts
CREATE TRIGGER update_advertiser_accounts_updated_at
  BEFORE UPDATE ON advertiser_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();