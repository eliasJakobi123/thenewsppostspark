// Simple Digistore24 IPN Handler for testing
export default async function handler(req, res) {
    try {
        // Set CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // Handle preflight requests
        if (req.method === 'OPTIONS') {
            return res.status(200).end();
        }
        
        // Only allow POST requests
        if (req.method !== 'POST') {
            console.log('IPN: Method not allowed:', req.method);
            return res.status(405).json({ error: 'Method not allowed' });
        }

        const eventData = req.body;
        console.log('IPN received:', JSON.stringify(eventData, null, 2));
        
        // Debug environment variables
        const envDebug = {
            hasSupabaseUrl: !!process.env.VITE_SUPABASE_URL,
            hasSupabaseServiceKey: !!process.env.SUPABASE_SERVICE_KEY,
            supabaseUrl: process.env.VITE_SUPABASE_URL,
            availableEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
            nodeVersion: process.version,
            platform: process.platform
        };
        
        console.log('Environment debug:', envDebug);

        // Simple response for now - just acknowledge receipt
        return res.status(200).json({ 
            success: true,
            message: 'IPN received successfully',
            timestamp: new Date().toISOString(),
            received_data: eventData,
            debug: envDebug
        });

    } catch (error) {
        console.error('IPN Handler Error:', error);
        console.error('Error stack:', error.stack);
        
        // Always return 200 to Digistore24 to prevent retries
        return res.status(200).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
