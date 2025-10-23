-- Create test campaign for frw@gmail.com (only with existing columns)
INSERT INTO campaigns (
    user_id,
    name,
    description,
    keywords,
    subreddits,
    status,
    created_at,
    updated_at
) VALUES (
    (SELECT id FROM auth.users WHERE email = 'frw@gmail.com'),
    'AI Automation Test Campaign',
    'Advanced AI automation tool that helps businesses streamline their workflows and increase productivity by 300%',
    ARRAY['AI', 'automation', 'business', 'productivity', 'workflow'],
    ARRAY['r/entrepreneur', 'r/startups', 'r/smallbusiness', 'r/marketing', 'r/productivity'],
    'active',
    NOW(),
    NOW()
);

-- Insert some test posts for the campaign
INSERT INTO posts (
    campaign_id,
    reddit_id,
    title,
    content,
    subreddit,
    score,
    url,
    reddit_created_at,
    created_at
) VALUES (
    (SELECT id FROM campaigns WHERE name = 'AI Automation Test Campaign' LIMIT 1),
    'test_post_1',
    'Looking for AI tools to automate my business processes',
    'I run a small marketing agency and we''re drowning in repetitive tasks. Does anyone know of good AI automation tools that can help us streamline our workflows? We handle social media, email campaigns, and client reporting. Budget is around $500/month.',
    'r/entrepreneur',
    85,
    'https://reddit.com/r/entrepreneur/comments/test_post_1',
    NOW() - INTERVAL '2 days',
    NOW()
),
(
    (SELECT id FROM campaigns WHERE name = 'AI Automation Test Campaign' LIMIT 1),
    'test_post_2',
    'Best AI automation software for startups?',
    'We''re a 5-person startup and need to automate our lead generation and follow-up processes. Currently doing everything manually and it''s not scalable. Any recommendations for AI tools that can help us automate our sales pipeline?',
    'r/startups',
    92,
    'https://reddit.com/r/startups/comments/test_post_2',
    NOW() - INTERVAL '1 day',
    NOW()
),
(
    (SELECT id FROM campaigns WHERE name = 'AI Automation Test Campaign' LIMIT 1),
    'test_post_3',
    'How to automate repetitive business tasks?',
    'I spend 3-4 hours daily on repetitive tasks like data entry, email follow-ups, and report generation. Looking for AI solutions that can help me focus on more strategic work. What tools do you recommend?',
    'r/smallbusiness',
    78,
    'https://reddit.com/r/smallbusiness/comments/test_post_3',
    NOW() - INTERVAL '3 hours',
    NOW()
);