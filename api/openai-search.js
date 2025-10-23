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

        // Prepare the input string
        const inputString = `Search Reddit for REAL posts about these topics:

TOPICS: ${keywords.join(', ')}

TASK: Find real Reddit posts where people discuss these topics. Only return actual posts that exist on Reddit.

SEARCH CRITERIA:
- Look in subreddits like r/selfimprovement, r/motivation, r/productivity, r/lifehacks, r/mentalhealth, r/advice, r/AskReddit
- Find posts where people ask questions, share experiences, or discuss problems related to these topics
- Include posts about personal development, life advice, motivation, productivity, mental health, relationships, career, goals

BUSINESS CONTEXT: ${businessName} - ${offer}

IMPORTANT: 
1. ONLY search for REAL Reddit posts that actually exist
2. Do NOT create or generate fake posts
3. If you can't find enough real posts, return fewer posts but they must be real
4. Focus on posts where people are seeking help, advice, or solutions

Return real Reddit posts in JSON format with high relevance scores (70-100).`;

        // Debug: Log the complete request
        console.log('OpenAI Request Debug:', {
            url: 'https://api.openai.com/v1/responses',
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY?.substring(0, 10)}...`,
                'Content-Type': 'application/json'
            },
            body: {
                prompt: {
                    id: "pmpt_68f8d8289b30819581a9aa70a071dcfa0b01db2d8e8856af",
                    version: "9"
                },
                input: inputString
            }
        });

        // Use OpenAI Chat Assistant with responses API - Version 9
        const response = await fetch('https://api.openai.com/v1/responses', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.VITE_OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                prompt: {
                    id: "pmpt_68f8d8289b30819581a9aa70a071dcfa0b01db2d8e8856af",
                    version: "9"
                },
                input: inputString,
                tools: [{ type: 'web_search_preview' }]
            })
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
        console.log('OpenAI Chat Assistant response:', JSON.stringify(data, null, 2));
        
        // The responses API returns data in output array format
        let posts = [];
        
        console.log('🚀 NEW CODE VERSION - OpenAI response structure:', {
            hasOutput: !!data.output,
            outputLength: data.output?.length,
            outputTypes: data.output?.map(item => item.type)
        });
        
        // Look for posts in the output array
        if (data.output && Array.isArray(data.output)) {
            for (const outputItem of data.output) {
                if (outputItem.type === 'message' && outputItem.content) {
                    for (const contentItem of outputItem.content) {
                        if (contentItem.type === 'output_text' && contentItem.text) {
                            console.log('Found text content (first 200 chars):', contentItem.text.substring(0, 200) + '...');
                            
                            try {
                                // Try to extract JSON from the text (look for ```json blocks)
                                const jsonMatch = contentItem.text.match(/```json\n([\s\S]*?)\n```/);
                                if (jsonMatch) {
                                    const jsonText = jsonMatch[1];
                                    console.log('Extracted JSON (first 500 chars):', jsonText.substring(0, 500) + '...');
                                    console.log('Full JSON length:', jsonText.length);
                                    
                                    const result = JSON.parse(jsonText);
                                    if (result && result.posts && Array.isArray(result.posts)) {
                                        posts = result.posts;
                                        console.log(`OpenAI found ${posts.length} relevant Reddit posts`);
                                        break;
                                    }
                                } else {
                                    // Try to find JSON without ```json blocks
                                    console.log('No ```json block found, trying to find JSON in text...');
                                    const jsonStart = contentItem.text.indexOf('{');
                                    const jsonEnd = contentItem.text.lastIndexOf('}');
                                    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
                                        const jsonText = contentItem.text.substring(jsonStart, jsonEnd + 1);
                                        console.log('Found JSON in text (first 500 chars):', jsonText.substring(0, 500) + '...');
                                        
                                        const result = JSON.parse(jsonText);
                                        if (result && result.posts && Array.isArray(result.posts)) {
                                            posts = result.posts;
                                            console.log(`OpenAI found ${posts.length} relevant Reddit posts`);
                                            break;
                                        }
                                    }
                                }
                            } catch (parseError) {
                                console.error('JSON parse error:', parseError);
                                console.log('Raw text content (first 1000 chars):', contentItem.text.substring(0, 1000));
                                
                                // Try to extract partial JSON if it's incomplete
                                try {
                                    const jsonStart = contentItem.text.indexOf('{');
                                    if (jsonStart !== -1) {
                                        // Try to find the last complete post
                                        const postsMatch = contentItem.text.match(/\{[^}]*"reddit_id"[^}]*\}/g);
                                        if (postsMatch && postsMatch.length > 0) {
                                            console.log(`Found ${postsMatch.length} complete posts in partial JSON`);
                                            posts = postsMatch.map(postStr => {
                                                try {
                                                    return JSON.parse(postStr);
                                                } catch (e) {
                                                    return null;
                                                }
                                            }).filter(post => post !== null);
                                            
                                            if (posts.length > 0) {
                                                console.log(`Extracted ${posts.length} posts from partial JSON`);
                                                break;
                                            }
                                        }
                                    }
                                } catch (fallbackError) {
                                    console.error('Fallback JSON extraction failed:', fallbackError);
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Fallback: try other response fields
        if (posts.length === 0) {
            console.log('No posts found in output array, trying fallback...');
            console.log('Available data keys:', Object.keys(data));
            
            // Try direct posts field
            posts = data.posts || data.data?.posts || [];
            console.log('Posts from fallback extraction:', posts.length);
        }
        
        res.status(200).json({ posts: posts.slice(0, 30) });
        
    } catch (error) {
        console.error('Error with OpenAI search:', error);
        res.status(500).json({ error: error.message });
    }
}
