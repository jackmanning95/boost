/*
  # Create campaign comments table

  1. New Tables
    - `campaign_comments`
      - `id` (uuid, primary key)
      - `campaign_id` (text, foreign key to campaigns)
      - `user_id` (uuid, foreign key to auth.users)
      - `parent_comment_id` (uuid, foreign key to campaign_comments for threading)
      - `content` (text, comment content)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)

  2. Security
    - Enable RLS on `campaign_comments` table
    - Add policies for users to insert their own comments on accessible campaigns
    - Add policies for users to read comments on accessible campaigns
    - Add policies for users to update/delete their own comments
    - Admins can access all comments

  3. Performance
    - Add indexes on campaign_id, user_id, parent_comment_id, and created_at
    - Add trigger for automatic updated_at timestamp updates
*/

-- Create campaign_comments table
CREATE TABLE IF NOT EXISTS campaign_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id text NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id uuid REFERENCES campaign_comments(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE campaign_comments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can insert their own comments" ON campaign_comments;
DROP POLICY IF EXISTS "Users can read accessible campaign comments" ON campaign_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON campaign_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON campaign_comments;

-- Policy: Users can insert their own comments on campaigns they have access to
CREATE POLICY "Users can insert their own comments"
  ON campaign_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id AND
    (
      -- Users can comment on their own campaigns
      campaign_id IN (
        SELECT id FROM campaigns WHERE client_id = auth.uid()
      ) OR
      -- Admins can comment on any campaign
      EXISTS (
        SELECT 1 FROM users 
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );

-- Policy: Users can read comments on campaigns they have access to
CREATE POLICY "Users can read accessible campaign comments"
  ON campaign_comments
  FOR SELECT
  TO authenticated
  USING (
    -- Users can read comments on their own campaigns
    campaign_id IN (
      SELECT id FROM campaigns WHERE client_id = auth.uid()
    ) OR
    -- Admins can read all comments
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own comments"
  ON campaign_comments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own comments (optional)
CREATE POLICY "Users can delete their own comments"
  ON campaign_comments
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add updated_at trigger (drop first if exists)
DROP TRIGGER IF EXISTS update_campaign_comments_updated_at ON campaign_comments;
CREATE TRIGGER update_campaign_comments_updated_at
  BEFORE UPDATE ON campaign_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_campaign_comments_campaign_id ON campaign_comments(campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_user_id ON campaign_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_parent_id ON campaign_comments(parent_comment_id);
CREATE INDEX IF NOT EXISTS idx_campaign_comments_created_at ON campaign_comments(created_at);