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
CREATE TABLE IF NOT EXISTS public.campaigns (
    id text PRIMARY KEY,
    name text NOT NULL,
    client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    audiences jsonb DEFAULT '[]'::jsonb NOT NULL,
    platforms jsonb DEFAULT '{"social": [], "programmatic": []}'::jsonb NOT NULL,
    budget numeric DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    status text DEFAULT 'draft'::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    updated_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT campaigns_status_check CHECK (status IN ('draft', 'submitted', 'approved', 'active', 'completed'))
);

-- Enable RLS for campaigns
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies for campaigns
CREATE POLICY "Enable read access for all users"
    ON public.campaigns FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON public.campaigns FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Enable update for authenticated users on their own campaigns"
    ON public.campaigns FOR UPDATE
    USING (auth.uid() = client_id);

CREATE POLICY "Enable delete for authenticated users on their own campaigns"
    ON public.campaigns FOR DELETE
    USING (auth.uid() = client_id);

-- Create audience_requests table
CREATE TABLE IF NOT EXISTS public.audience_requests (
    id text PRIMARY KEY,
    campaign_id text REFERENCES public.campaigns(id) ON DELETE CASCADE NOT NULL,
    client_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    audiences jsonb DEFAULT '[]'::jsonb NOT NULL,
    platforms jsonb DEFAULT '{"social": [], "programmatic": []}'::jsonb NOT NULL,
    budget numeric DEFAULT 0 NOT NULL,
    start_date date,
    end_date date,
    notes text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamptz DEFAULT now() NOT NULL,
    CONSTRAINT audience_requests_status_check CHECK (status IN ('pending', 'reviewed', 'approved', 'rejected'))
);

-- Enable RLS for audience_requests
ALTER TABLE public.audience_requests ENABLE ROW LEVEL SECURITY;

-- Create policies for audience_requests
CREATE POLICY "Enable read access for all users"
    ON public.audience_requests FOR SELECT
    USING (true);

CREATE POLICY "Enable insert for authenticated users"
    ON public.audience_requests FOR INSERT
    WITH CHECK (auth.uid() = client_id);

CREATE POLICY "Enable update for authenticated users on their own requests"
    ON public.audience_requests FOR UPDATE
    USING (auth.uid() = client_id);

CREATE POLICY "Enable delete for authenticated users on their own requests"
    ON public.audience_requests FOR DELETE
    USING (auth.uid() = client_id);

-- Add updated_at trigger for campaigns
CREATE TRIGGER update_campaigns_updated_at
    BEFORE UPDATE ON public.campaigns
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();