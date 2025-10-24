-- Update Reddit Post ID usage in the application
-- This script shows how to use the reddit_post_id column in queries

-- Example query to get posts with Reddit post IDs for commenting
SELECT 
    id,
    title,
    content,
    subreddit,
    reddit_post_id,
    created_at
FROM posts 
WHERE reddit_post_id IS NOT NULL 
  AND reddit_post_id != 't3_placeholder'
ORDER BY created_at DESC;

-- Example query to find posts that need Reddit post IDs
SELECT 
    id,
    title,
    subreddit,
    url,
    created_at
FROM posts 
WHERE reddit_post_id IS NULL 
   OR reddit_post_id = 't3_placeholder'
ORDER BY created_at DESC;

-- Example query to update a specific post with Reddit post ID
-- UPDATE posts 
-- SET reddit_post_id = 't3_abc123def456'
-- WHERE id = 'your-post-id-here';

-- Example query to get posts by subreddit with Reddit post IDs
SELECT 
    id,
    title,
    reddit_post_id,
    subreddit
FROM posts 
WHERE subreddit = 'your-subreddit-here'
  AND reddit_post_id IS NOT NULL
  AND reddit_post_id != 't3_placeholder';
