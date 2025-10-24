-- Add Reddit Post ID column to posts table
-- This script adds a reddit_post_id column to store Reddit post IDs for commenting

-- Add reddit_post_id column to posts table
ALTER TABLE posts 
ADD COLUMN reddit_post_id TEXT;

-- Add index for better performance when searching by Reddit post ID
CREATE INDEX IF NOT EXISTS idx_posts_reddit_post_id ON posts(reddit_post_id);

-- Add comment to document the column
COMMENT ON COLUMN posts.reddit_post_id IS 'Reddit post ID (e.g., t3_abc123def456) for commenting functionality';

-- Update existing posts with placeholder Reddit post IDs if needed
-- This is optional - only run if you want to set default values
-- UPDATE posts 
-- SET reddit_post_id = 't3_placeholder' 
-- WHERE reddit_post_id IS NULL;

-- Grant permissions for the reddit_post_id column
-- This ensures the column is accessible via Supabase API
GRANT SELECT, INSERT, UPDATE ON posts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON posts TO anon;
