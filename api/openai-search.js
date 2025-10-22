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
        const searchQuery = `I need help analyzing potential customer conversations for a business. Please create examples of discussion topics that would be relevant for this business:

BUSINESS DETAILS:
Name: ${businessName}
Description: ${offer}
Keywords: ${keywords.join(', ')}
Target Subreddits: ${subreddits.join(', ')}

Please create examples of discussion topics where potential customers might:
- Ask for solutions to problems this business solves
- Discuss pain points this product addresses
- Look for recommendations in this industry
- Share frustrations with current tools

Return the examples in JSON format with this structure:
{
  "posts": [
    {
      "title": "Discussion topic title",
      "content": "Example discussion content",
      "subreddit": "r/subreddit",
      "author": "example_user",
      "score": 85,
      "url": "https://reddit.com/example",
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
