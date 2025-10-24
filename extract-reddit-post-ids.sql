-- Extract Reddit Post IDs from existing posts
-- This script attempts to extract Reddit post IDs from existing post data

-- Function to extract Reddit post ID from URL or title
-- This is a helper function to extract Reddit post IDs from various sources
CREATE OR REPLACE FUNCTION extract_reddit_post_id(post_url TEXT, post_title TEXT)
RETURNS TEXT AS $$
DECLARE
    reddit_id TEXT;
BEGIN
    -- Try to extract from URL first
    IF post_url IS NOT NULL THEN
        -- Extract from Reddit URL pattern: https://reddit.com/r/subreddit/comments/abc123/title/
        reddit_id := (SELECT regexp_matches(post_url, '/comments/([a-zA-Z0-9]+)/', 'g'))[1];
        IF reddit_id IS NOT NULL THEN
            RETURN 't3_' || reddit_id;
        END IF;
    END IF;
    
    -- Try to extract from title if it contains Reddit post ID
    IF post_title IS NOT NULL THEN
        -- Look for Reddit post ID pattern in title
        reddit_id := (SELECT regexp_matches(post_title, 't3_([a-zA-Z0-9]+)', 'g'))[1];
        IF reddit_id IS NOT NULL THEN
            RETURN 't3_' || reddit_id;
        END IF;
    END IF;
    
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Update posts with extracted Reddit post IDs
-- This will attempt to extract Reddit post IDs from existing data
UPDATE posts 
SET reddit_post_id = extract_reddit_post_id(url, title)
WHERE reddit_post_id IS NULL 
  AND (url IS NOT NULL OR title IS NOT NULL);

-- Show statistics of the update
SELECT 
    COUNT(*) as total_posts,
    COUNT(reddit_post_id) as posts_with_reddit_id,
    COUNT(*) - COUNT(reddit_post_id) as posts_without_reddit_id
FROM posts;

-- Clean up the helper function
DROP FUNCTION extract_reddit_post_id(TEXT, TEXT);
