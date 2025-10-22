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

        // Prepare the request body - try with input parameter
        const requestBody = {
            prompt: {
                id: "pmpt_68f8d8289b30819581a9aa70a071dcfa0b01db2d8e8856af",
                version: "7"
            },
            input: {
                business_name: businessName,
                business_description: offer,
                keywords: keywords,
                target_subreddits: subreddits
            }
        };

        // Debug: Log the complete request
        console.log('OpenAI Request Debug:', {
            url: 'https://api.openai.com/v1/responses',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY?.substring(0, 10)}...`,
                'Content-Type': 'application/json'
            },
            body: requestBody
        });

        // Use OpenAI Chat Assistant with responses API
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('OpenAI API Error Details:', {
                status: response.status,
                statusText: response.statusText,
                headers: Object.fromEntries(response.headers.entries()),
                body: errorText
            });
            throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('OpenAI Chat Assistant response:', data);
        
        // The responses API returns data in a different format
        let posts = [];
        
        if (data.choices && data.choices[0] && data.choices[0].message) {
            // Standard chat completion format
            const content = data.choices[0].message.content;
            console.log('Response content:', content.substring(0, 200) + '...');
            
            try {
                const result = JSON.parse(content);
                posts = result.posts || [];
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                return res.status(500).json({ 
                    error: 'OpenAI returned non-JSON response',
                    content: content.substring(0, 500),
                    parseError: parseError.message
                });
            }
        } else if (data.content) {
            // Direct content response
            console.log('Direct content response:', data.content.substring(0, 200) + '...');
            
            try {
                const result = JSON.parse(data.content);
                posts = result.posts || [];
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                return res.status(500).json({ 
                    error: 'OpenAI returned non-JSON response',
                    content: data.content.substring(0, 500),
                    parseError: parseError.message
                });
            }
        } else if (data.data && data.data.posts) {
            // Posts directly in data
            posts = data.data.posts;
        } else {
            // Try to extract posts from any format
            posts = data.posts || data.data?.posts || [];
        }
        
        res.status(200).json({ posts: posts.slice(0, 25) });
        
    } catch (error) {
        console.error('Error with OpenAI search:', error);
        res.status(500).json({ error: error.message });
    }
}
