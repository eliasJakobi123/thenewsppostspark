// Script to create a test campaign directly in Supabase
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://your-project.supabase.co'
const supabaseKey = 'your-anon-key'

const supabase = createClient(supabaseUrl, supabaseKey)

async function createTestCampaign() {
    try {
        const { data, error } = await supabase
            .from('campaigns')
            .insert({
                name: 'Test Campaign',
                description: 'AI automation tool for businesses',
                keywords: ['AI', 'automation', 'business'],
                website_url: 'https://example.com',
                subreddits: ['r/entrepreneur', 'r/startups'],
                target_audience: 'Small business owners',
                status: 'active'
            })
            .select()
            .single()

        if (error) throw error
        console.log('Test campaign created:', data)
    } catch (error) {
        console.error('Error:', error)
    }
}

createTestCampaign()
