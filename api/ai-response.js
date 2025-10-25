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
            customOffer,
            responseLength
        } = req.body;

        // Validate required fields
        if (!postContent || !offer) {
            return res.status(400).json({ error: 'Post content and offer are required' });
        }

        // OpenAI API configuration
        const OPENAI_API_KEY = process.env.VITE_OPENAI_API_KEY;

        // Build the prompt based on settings
        const prompt = buildPrompt({
            postContent,
            postTitle,
            offer: customOffer || offer,
            websiteUrl,
            tone,
            salesStrength,
            responseLength
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

function buildPrompt({ postContent, postTitle, offer, websiteUrl, tone, salesStrength, responseLength }) {
    const toneInstructions = {
        'friendly': 'Use a warm, approachable tone. Be conversational and helpful.',
        'professional': 'Use a professional, business-like tone. Be formal but not cold.',
        'casual': 'Use a relaxed, informal tone. Be conversational and easy-going.',
        'expert': 'Use an authoritative, knowledgeable tone. Show expertise and confidence.'
    };

    const salesInstructions = {
        1: 'Mention your solution very subtly. Focus on being helpful first.',
        2: 'Present your solution naturally. Balance helpfulness with promotion.',
        3: 'Be more direct about your solution. Still be helpful but more promotional.',
        4: 'Be direct and promotional. Focus on selling your solution.'
    };

    // Determine response length based on user setting
    let lengthInstruction = '';
    if (responseLength === 1) {
        lengthInstruction = 'Keep the response VERY SHORT - maximum 1-2 sentences. Be concise and direct.';
    } else if (responseLength === 2) {
        lengthInstruction = 'Keep the response SHORT - maximum 2-3 sentences. Be brief but helpful.';
    } else if (responseLength === 3) {
        lengthInstruction = 'Keep the response MEDIUM - maximum 3-4 sentences. Provide some detail but stay focused.';
    } else {
        lengthInstruction = 'Keep the response at a reasonable length - provide helpful detail as needed.';
    }

    // Only include website if it's actually provided
    let websiteInstruction = '';
    if (websiteUrl && websiteUrl.trim() !== '') {
        websiteInstruction = `4. Include this website link only if it's real: ${websiteUrl}`;
    } else {
        websiteInstruction = '4. DO NOT include any website URLs - no website link should be mentioned.';
    }

    return `
Generate a helpful response to this Reddit post:

POST TITLE: ${postTitle}
POST CONTENT: ${postContent}

Your task:
1. Write a genuine, helpful response that adds value to the discussion
2. Naturally mention this solution: ${offer}
3. ${websiteInstruction}
4. Use ${tone} tone: ${toneInstructions[tone]}
5. Sales approach: ${salesInstructions[salesStrength]}
6. ${lengthInstruction}

CRITICAL RULES:
- Be authentic and helpful, not spammy
- Address the user's specific problem or question
- Provide genuine value before mentioning your solution
- Keep it conversational and natural
- Don't be overly promotional
- Make it feel like a genuine community member responding
- NEVER create or mention fake website names or URLs
- ONLY include the website link if a real one is provided above
- DO NOT invent website names, URLs, or links

Generate a response that feels natural and helpful:
`;
}
