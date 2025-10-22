// Backend API endpoint for OpenAI search
// This runs on the server side and can safely access environment variables

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { campaignData } = req.body;
        
        console.log('Environment check:', {
            hasApiKey: !!process.env.VITE_OPENAI_API_KEY,
            apiKeyLength: process.env.VITE_OPENAI_API_KEY?.length,
            apiKeyStart: process.env.VITE_OPENAI_API_KEY?.substring(0, 10)
        });
        
        if (!process.env.VITE_OPENAI_API_KEY) {
            return res.status(500).json({ error: 'OpenAI API key not configured' });
        }

        const keywords = campaignData.keywords || ['lead generation', 'marketing'];
        const subreddits = Array.isArray(campaignData.subreddits) ? campaignData.subreddits : ['r/entrepreneur', 'r/smallbusiness'];
        const offer = campaignData.description || 'business solution';
        const businessName = campaignData.name || 'Business Solution';

        // Create search query for the assistant
        const searchQuery = `Find real Reddit posts that match this business:

BUSINESS DETAILS:
Name: ${businessName}
Description: ${offer}
Keywords: ${keywords.join(', ')}
Target Subreddits: ${subreddits.join(', ')}

Please search for actual Reddit posts where people are:
- Asking for solutions to problems your business solves
- Discussing pain points your product addresses
- Looking for recommendations in your industry
- Sharing frustrations with current tools

Return the posts in JSON format with this structure:
{
  "posts": [
    {
      "title": "Post title",
      "content": "Post content",
      "subreddit": "r/subreddit",
      "author": "username",
      "score": 85,
      "url": "https://reddit.com/...",
      "created_utc": 1234567890
    }
  ]
}`;

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [
                    {
                        role: 'user',
                        content: searchQuery
                    }
                ],
                max_tokens: 4000,
                temperature: 0.3
            })
        });

        if (!response.ok) {
            throw new Error(`OpenAI API error: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;
        
        // Parse JSON response
        const result = JSON.parse(content);
        const posts = result.posts || [];
        
        res.status(200).json({ posts: posts.slice(0, 25) });
        
    } catch (error) {
        console.error('Error with OpenAI search:', error);
        res.status(500).json({ error: error.message });
    }
}
