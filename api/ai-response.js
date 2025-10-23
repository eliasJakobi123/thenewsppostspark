// AI Response Generation API
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const { 
            postContent, 
            postTitle, 
            offer, 
            websiteUrl, 
            tone, 
            salesStrength, 
            customOffer 
        } = req.body;

        // Validate required fields
        if (!postContent || !offer) {
            return res.status(400).json({ error: 'Post content and offer are required' });
        }

        // OpenAI API configuration
        const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

        // Build the prompt based on settings
        const prompt = buildPrompt({
            postContent,
            postTitle,
            offer: customOffer || offer,
            websiteUrl,
            tone,
            salesStrength
        });

        // Call OpenAI API
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'gpt-3.5-turbo',
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful assistant that generates authentic, helpful responses to Reddit posts. Always be genuine and provide value.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                max_tokens: 500,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('OpenAI API error:', errorData);
            return res.status(500).json({ error: 'Failed to generate AI response' });
        }

        const data = await response.json();
        const aiResponse = data.choices[0].message.content.trim();

        res.status(200).json({ 
            success: true, 
            response: aiResponse 
        });

    } catch (error) {
        console.error('Error generating AI response:', error);
        res.status(500).json({ error: error.message });
    }
}

function buildPrompt({ postContent, postTitle, offer, websiteUrl, tone, salesStrength }) {
    const toneInstructions = {
        'friendly': 'Use a warm, approachable tone. Be conversational and helpful.',
        'professional': 'Use a professional, business-like tone. Be formal but not cold.',
        'casual': 'Use a relaxed, informal tone. Be conversational and easy-going.',
        'expert': 'Use an authoritative, knowledgeable tone. Show expertise and confidence.'
    };

    const salesInstructions = {
        'subtle': 'Mention your solution very subtly. Focus on being helpful first.',
        'moderate': 'Present your solution naturally. Balance helpfulness with promotion.',
        'direct': 'Be more direct about your solution. Still be helpful but more promotional.',
        'aggressive': 'Be direct and promotional. Focus on selling your solution.'
    };

    return `
Generate a helpful response to this Reddit post:

POST TITLE: ${postTitle}
POST CONTENT: ${postContent}

Your task:
1. Write a genuine, helpful response that adds value to the discussion
2. Naturally mention this solution: ${offer}
3. Include this website link: ${websiteUrl}
4. Use ${tone} tone: ${toneInstructions[tone]}
5. Sales approach: ${salesInstructions[salesStrength]}

Guidelines:
- Be authentic and helpful, not spammy
- Address the user's specific problem or question
- Provide genuine value before mentioning your solution
- Keep it conversational and natural
- Don't be overly promotional
- Make it feel like a genuine community member responding

Generate a response that feels natural and helpful:
`;
}
