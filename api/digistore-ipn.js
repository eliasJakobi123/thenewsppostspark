// Digistore24 IPN Handler
// Handles subscription events from Digistore24

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ntutkssgqzqgmbvuwjqu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseServiceKey) {
    console.error('SUPABASE_SERVICE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Digistore24 configuration
const DIGISTORE24_MERCHANT_ID = process.env.DIGISTORE24_MERCHANT_ID || '13809';
const DIGISTORE24_IPN_SECRET = process.env.DIGISTORE24_IPN_SECRET || 'ORA_digi_2025_s3cur3_ipn_X7kP9mQ4';

// Product ID mappings
const PRODUCT_MAPPINGS = {
    '643746': 'starter',    // Starter Plan
    '643752': 'pro',        // Pro Plan  
    '643754': 'enterprise', // Enterprise Plan
    '1322890': 'upgrade_pro', // Upgrade to Pro
    '1322889': 'upgrade_enterprise' // Upgrade to Enterprise
};

// Plan configurations
const PLAN_CONFIGS = {
    'starter': {
        max_campaigns: 1,
        max_refreshes_per_campaign: 10,
        max_refreshes_per_month: 10,
        features: {
            analytics: 'basic',
            support: 'email',
            api_access: false
        }
    },
    'pro': {
        max_campaigns: 5,
        max_refreshes_per_campaign: 10,
        max_refreshes_per_month: 50,
        features: {
            analytics: 'advanced',
            support: 'priority',
            api_access: false,
            custom_keywords: true
        }
    },
    'enterprise': {
        max_campaigns: 15,
        max_refreshes_per_campaign: 10,
        max_refreshes_per_month: 150,
        features: {
            analytics: 'full',
            support: '24/7',
            api_access: true,
            custom_integrations: true
        }
    }
};

async function logIPN(data, eventType = null, errorMessage = null) {
    try {
        const { data: logData, error } = await supabase
            .from('ipn_logs')
            .insert({
                raw_data: data,
                event_type: eventType,
                order_id: data.order_id || data.orderId,
                user_id: data.user_id || null,
                processed: !errorMessage,
                error_message: errorMessage
            });
        
        if (error) {
            console.error('Failed to log IPN:', error);
        }
    } catch (err) {
        console.error('Error logging IPN:', err);
    }
}

async function findUserByEmail(email) {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('id')
            .eq('email', email)
            .single();
        
        if (error && error.code !== 'PGRST116') {
            throw error;
        }
        
        return data;
    } catch (err) {
        console.error('Error finding user by email:', err);
        return null;
    }
}

async function getSubscriptionPlan(planCode) {
    try {
        const { data, error } = await supabase
            .from('subscription_plans')
            .select('*')
            .eq('plan_code', planCode)
            .single();
        
        if (error) {
            throw error;
        }
        
        return data;
    } catch (err) {
        console.error('Error getting subscription plan:', err);
        return null;
    }
}

async function createOrUpdateSubscription(userId, planCode, orderData) {
    try {
        const plan = await getSubscriptionPlan(planCode);
        if (!plan) {
            throw new Error(`Plan not found: ${planCode}`);
        }

        // Check if user already has an active subscription
        const { data: existingSubscription, error: existingError } = await supabase
            .from('user_subscriptions')
            .select('*')
            .eq('user_id', userId)
            .eq('status', 'active')
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            throw existingError;
        }

        if (existingSubscription) {
            // Update existing subscription
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1); // Default to 1 month

            const { error: updateError } = await supabase
                .from('user_subscriptions')
                .update({
                    plan_id: plan.id,
                    digistore_order_id: orderData.order_id || orderData.orderId,
                    digistore_transaction_id: orderData.transaction_id || orderData.transactionId,
                    status: 'active',
                    expires_at: expiresAt.toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', existingSubscription.id);

            if (updateError) {
                throw updateError;
            }

            return existingSubscription.id;
        } else {
            // Create new subscription
            const expiresAt = new Date();
            expiresAt.setMonth(expiresAt.getMonth() + 1); // Default to 1 month

            const { data: newSubscription, error: createError } = await supabase
                .from('user_subscriptions')
                .insert({
                    user_id: userId,
                    plan_id: plan.id,
                    digistore_order_id: orderData.order_id || orderData.orderId,
                    digistore_transaction_id: orderData.transaction_id || orderData.transactionId,
                    status: 'active',
                    expires_at: expiresAt.toISOString()
                })
                .select()
                .single();

            if (createError) {
                throw createError;
            }

            return newSubscription.id;
        }
    } catch (err) {
        console.error('Error creating/updating subscription:', err);
        throw err;
    }
}

async function cancelSubscription(orderId) {
    try {
        const { error } = await supabase
            .from('user_subscriptions')
            .update({
                status: 'cancelled',
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('digistore_order_id', orderId);

        if (error) {
            throw error;
        }
    } catch (err) {
        console.error('Error cancelling subscription:', err);
        throw err;
    }
}

async function processSubscriptionEvent(eventData) {
    try {
        const productId = eventData.product_id || eventData.productId;
        const planCode = PRODUCT_MAPPINGS[productId];
        
        if (!planCode) {
            throw new Error(`Unknown product ID: ${productId}`);
        }

        // Handle upgrade products
        if (planCode.startsWith('upgrade_')) {
            const targetPlan = planCode.replace('upgrade_', '');
            return await processUpgrade(eventData, targetPlan);
        }

        // Find user by email
        const userEmail = eventData.email || eventData.customer_email;
        if (!userEmail) {
            throw new Error('No email found in event data');
        }

        const user = await findUserByEmail(userEmail);
        if (!user) {
            throw new Error(`User not found for email: ${userEmail}`);
        }

        // Create or update subscription
        const subscriptionId = await createOrUpdateSubscription(user.id, planCode, eventData);
        
        return {
            success: true,
            subscriptionId,
            planCode,
            userId: user.id
        };
    } catch (err) {
        console.error('Error processing subscription event:', err);
        throw err;
    }
}

async function processUpgrade(eventData, targetPlan) {
    try {
        const userEmail = eventData.email || eventData.customer_email;
        if (!userEmail) {
            throw new Error('No email found in upgrade event data');
        }

        const user = await findUserByEmail(userEmail);
        if (!user) {
            throw new Error(`User not found for email: ${userEmail}`);
        }

        // Get target plan
        const plan = await getSubscriptionPlan(targetPlan);
        if (!plan) {
            throw new Error(`Target plan not found: ${targetPlan}`);
        }

        // Update user's subscription to new plan
        const { error } = await supabase
            .from('user_subscriptions')
            .update({
                plan_id: plan.id,
                digistore_order_id: eventData.order_id || eventData.orderId,
                digistore_transaction_id: eventData.transaction_id || eventData.transactionId,
                updated_at: new Date().toISOString()
            })
            .eq('user_id', user.id)
            .eq('status', 'active');

        if (error) {
            throw error;
        }

        return {
            success: true,
            planCode: targetPlan,
            userId: user.id
        };
    } catch (err) {
        console.error('Error processing upgrade:', err);
        throw err;
    }
}

export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        console.log('IPN: Method not allowed:', req.method);
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const eventData = req.body;
        console.log('IPN received:', JSON.stringify(eventData, null, 2));
        
        // Log the incoming IPN
        await logIPN(eventData, 'received');

        // Determine event type based on Digistore24 data
        let eventType = 'unknown';
        let result = null;

        // Check for different event types
        if (eventData.event_type) {
            eventType = eventData.event_type;
        } else if (eventData.status === 'completed' || eventData.payment_status === 'completed') {
            eventType = 'subscription_created';
        } else if (eventData.status === 'cancelled' || eventData.payment_status === 'cancelled') {
            eventType = 'subscription_cancelled';
        } else if (eventData.status === 'renewed' || eventData.payment_status === 'renewed') {
            eventType = 'subscription_renewed';
        }

        // Process based on event type
        switch (eventType) {
            case 'subscription_created':
            case 'subscription_renewed':
                result = await processSubscriptionEvent(eventData);
                break;
                
            case 'subscription_cancelled':
                const orderId = eventData.order_id || eventData.orderId;
                if (orderId) {
                    await cancelSubscription(orderId);
                    result = { success: true, action: 'cancelled' };
                }
                break;
                
            default:
                // Try to process as subscription event anyway
                try {
                    result = await processSubscriptionEvent(eventData);
                    eventType = 'subscription_processed';
                } catch (err) {
                    console.log('Could not process as subscription event:', err.message);
                }
        }

        // Log the result
        await logIPN(eventData, eventType, result ? null : 'Processing failed');

        // Return success response to Digistore24
        return res.status(200).json({ 
            success: true, 
            event_type: eventType,
            result: result 
        });

    } catch (error) {
        console.error('IPN Handler Error:', error);
        console.error('Error stack:', error.stack);
        
        // Log the error
        try {
            await logIPN(req.body, 'error', error.message);
        } catch (logError) {
            console.error('Failed to log IPN error:', logError);
        }
        
        // Always return 200 to Digistore24 to prevent retries
        return res.status(200).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message 
        });
    }
}
