// Backend API endpoint for OpenAI search
// This runs on the server side and can safely access environment variables

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { campaignData } = req.body;
        
        const debugInfo = {
            hasApiKey: !!process.env.VITE_OPENAI_API_KEY,
            apiKeyLength: process.env.VITE_OPENAI_API_KEY?.length,
            apiKeyStart: process.env.VITE_OPENAI_API_KEY?.substring(0, 10),
            allEnvKeys: Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('VITE'))
        };
        
        console.log('Environment check:', debugInfo);
        
        if (!process.env.VITE_OPENAI_API_KEY) {
            return res.status(500).json({ 
                error: 'OpenAI API key not configured',
                debug: debugInfo
            });
        }

        const keywords = campaignData.keywords || ['lead generation', 'marketing'];
        const subreddits = Array.isArray(campaignData.subreddits) ? campaignData.subreddits : ['r/entrepreneur', 'r/smallbusiness'];
        const offer = campaignData.description || 'business solution';
        const businessName = campaignData.name || 'Business Solution';

        // Create search query for the assistant
        const searchQuery = `I need you to help me identify the types of Reddit posts that would be most relevant for lead generation for this business. Based on your training data, what kinds of posts would people make in these subreddits when they need this type of solution?

BUSINESS DETAILS:
Name: ${businessName}
Description: ${offer}
Keywords: ${keywords.join(', ')}
Target Subreddits: ${subreddits.join(', ')}

Based on your knowledge of Reddit discussions, what types of posts would people make when they:
- Need solutions to problems this business solves
- Are frustrated with current tools in this space
- Are looking for recommendations for this type of product
- Are expressing interest in similar services

Please provide realistic examples of the types of posts that would appear in these subreddits, formatted as JSON:
{
  "posts": [
    {
      "title": "Realistic post title based on common Reddit patterns",
      "content": "Realistic post content that someone would actually write",
      "subreddit": "r/entrepreneur",
      "author": "realistic_username",
      "score": 85,
      "url": "https://reddit.com/r/entrepreneur/example",
      "created_utc": 1234567890
    }
  ]
}

Focus on realistic, authentic-sounding posts that would genuinely appear in these communities.`;

        // Use OpenAI Chat Assistant with responses API
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
                        content: `Use your web search capabilities to find real Reddit posts for this business:

BUSINESS: ${businessName}
DESCRIPTION: ${offer}
KEYWORDS: ${keywords.join(', ')}
TARGET SUBREDDITS: ${subreddits.join(', ')}

Search Reddit for posts where people are asking for solutions, discussing problems, or looking for recommendations related to this business.

Return the results in JSON format:
{
  "posts": [
    {
      "title": "Actual Reddit post title",
      "content": "Actual Reddit post content", 
      "subreddit": "r/subreddit_name",
      "author": "username",
      "score": 85,
      "url": "https://reddit.com/actual_url",
      "created_utc": 1234567890
    }
  ]
}`
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
        
        console.log('OpenAI response content:', content.substring(0, 200) + '...');
        
        // Try to parse JSON response
        let result;
        try {
            result = JSON.parse(content);
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            console.log('Raw content:', content);
            
            // If it's not JSON, return an error with the content
            return res.status(500).json({ 
                error: 'OpenAI returned non-JSON response',
                content: content.substring(0, 500),
                parseError: parseError.message
            });
        }
        
        const posts = result.posts || [];
        
        res.status(200).json({ posts: posts.slice(0, 25) });
        
    } catch (error) {
        console.error('Error with OpenAI search:', error);
        res.status(500).json({ error: error.message });
    }
}
