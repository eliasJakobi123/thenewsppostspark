// Digistore24 IPN Handler - Fixed Version
// Handles subscription events from Digistore24

import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ntutkssgqzqgmbvuwjqu.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

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

// Initialize Supabase client
let supabase;
try {
    if (!supabaseServiceKey) {
        throw new Error('SUPABASE_SERVICE_KEY environment variable is required');
    }
    supabase = createClient(supabaseUrl, supabaseServiceKey);
} catch (error) {
    console.error('Failed to initialize Supabase client:', error.message);
}

async function logIPN(data, eventType = null, errorMessage = null) {
    try {
        if (!supabase) {
            console.error('Supabase client not initialized, cannot log IPN');
            return;
        }

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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

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
                    digistore_order_id: orderData.order_id || orderData.orderId || orderData.order_id_digi,
                    digistore_transaction_id: orderData.transaction_id || orderData.transactionId || orderData.transaction_id_digi,
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
                    digistore_order_id: orderData.order_id || orderData.orderId || orderData.order_id_digi,
                    digistore_transaction_id: orderData.transaction_id || orderData.transactionId || orderData.transaction_id_digi,
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
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        if (!orderId) {
            throw new Error('No order ID provided for cancellation');
        }

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

        console.log(`Successfully cancelled subscription for order ID: ${orderId}`);
    } catch (err) {
        console.error('Error cancelling subscription:', err);
        throw err;
    }
}

async function processSubscriptionEvent(eventData) {
    try {
        console.log('Processing subscription event with data:', JSON.stringify(eventData, null, 2));
        
        // Digistore24 uses different field names - try multiple variations
        const productId = eventData.product_id || eventData.productId || eventData.product_id_digi || 
                         eventData.productid || eventData.product || eventData.item_id || eventData.itemid;
        const planCode = PRODUCT_MAPPINGS[productId];
        
        console.log('Product ID found:', productId);
        console.log('Plan code mapped:', planCode);
        
        if (!planCode) {
            console.log('Available product IDs in mapping:', Object.keys(PRODUCT_MAPPINGS));
            console.log('Received product ID:', productId);
            console.log('All product-related fields:', Object.keys(eventData).filter(key => 
                key.toLowerCase().includes('product') || key.toLowerCase().includes('item')));
            
            // Try to find any product-related field
            const productFields = Object.keys(eventData).filter(key => 
                key.toLowerCase().includes('product') || key.toLowerCase().includes('item'));
            
            if (productFields.length > 0) {
                console.log('Product fields found:', productFields.map(field => `${field}: ${eventData[field]}`));
            }
            
            throw new Error(`Unknown product ID: ${productId}. Available product fields: ${productFields.join(', ')}`);
        }

        // Handle upgrade products
        if (planCode.startsWith('upgrade_')) {
            const targetPlan = planCode.replace('upgrade_', '');
            return await processUpgrade(eventData, targetPlan);
        }

        // Find user by email - Digistore24 uses different field names
        const userEmail = eventData.email || eventData.customer_email || eventData.customer_email_address || 
                         eventData.buyer_email || eventData.user_email || eventData.customer_email_address || 
                         eventData.email_address || eventData.customeremail || eventData.buyeremail;
        
        console.log('Email fields found:', Object.keys(eventData).filter(key => key.toLowerCase().includes('email')));
        console.log('User email extracted:', userEmail);
        
        if (!userEmail) {
            const emailFields = Object.keys(eventData).filter(key => key.toLowerCase().includes('email'));
            console.log('Available email fields:', emailFields.map(field => `${field}: ${eventData[field]}`));
            throw new Error(`No email found in event data. Available email fields: ${emailFields.join(', ')}`);
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
            userId: user.id,
            userEmail: userEmail
        };
    } catch (err) {
        console.error('Error processing subscription event:', err);
        throw err;
    }
}

async function processUpgrade(eventData, targetPlan) {
    try {
        if (!supabase) {
            throw new Error('Supabase client not initialized');
        }

        const userEmail = eventData.email || eventData.customer_email || eventData.customer_email_address || eventData.buyer_email;
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
                digistore_order_id: eventData.order_id || eventData.orderId || eventData.order_id_digi,
                digistore_transaction_id: eventData.transaction_id || eventData.transactionId || eventData.transaction_id_digi,
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

        // Debug environment variables
        console.log('Environment check:', {
            hasSupabaseUrl: !!supabaseUrl,
            hasSupabaseServiceKey: !!supabaseServiceKey,
            supabaseUrl: supabaseUrl,
            availableEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE'))
        });

        // Check if Supabase client is initialized
        if (!supabase) {
            console.error('Supabase client not initialized - Environment variables missing');
            // Return success to Digistore24 but log the issue
            return res.status(200).json({ 
                success: true,
                message: 'IPN received but database not configured',
                debug: {
                    hasSupabaseUrl: !!supabaseUrl,
                    hasSupabaseServiceKey: !!supabaseServiceKey,
                    availableEnvVars: Object.keys(process.env).filter(key => key.includes('SUPABASE')),
                    note: 'Please set SUPABASE_SERVICE_KEY in Vercel environment variables'
                }
            });
        }

        const eventData = req.body;
        console.log('IPN received:', JSON.stringify(eventData, null, 2));
        console.log('IPN headers:', JSON.stringify(req.headers, null, 2));
        console.log('IPN method:', req.method);
        console.log('IPN query:', JSON.stringify(req.query, null, 2));
        
        // Log the incoming IPN
        await logIPN(eventData, 'received');

        // Determine event type based on Digistore24 data
        let eventType = 'unknown';
        let result = null;

        console.log('Available fields in eventData:', Object.keys(eventData));
        console.log('Event type fields:', {
            event_type: eventData.event_type,
            event_name: eventData.event_name,
            status: eventData.status,
            payment_status: eventData.payment_status,
            action: eventData.action,
            type: eventData.type
        });

        // Check for Digistore24 event types
        if (eventData.event_type) {
            eventType = eventData.event_type;
        } else if (eventData.event_name) {
            eventType = eventData.event_name;
        } else if (eventData.action) {
            eventType = eventData.action;
        } else if (eventData.type) {
            eventType = eventData.type;
        } else {
            // Fallback: try to determine from other fields
            if (eventData.status === 'completed' || eventData.payment_status === 'completed') {
                eventType = 'on_payment';
            } else if (eventData.status === 'cancelled' || eventData.payment_status === 'cancelled') {
                eventType = 'on_rebill_cancelled';
            } else if (eventData.status === 'refunded' || eventData.payment_status === 'refunded') {
                eventType = 'on_refund';
            } else if (eventData.status === 'failed' || eventData.payment_status === 'failed') {
                eventType = 'payment_denial';
            } else if (eventData.status === 'active' || eventData.payment_status === 'active') {
                eventType = 'on_payment';
            } else if (eventData.status === 'success' || eventData.payment_status === 'success') {
                eventType = 'on_payment';
            } else {
                // If we can't determine the event type, try to process as payment anyway
                eventType = 'on_payment';
                console.log('Could not determine event type, defaulting to on_payment');
            }
        }

        // Process based on Digistore24 event type
        switch (eventType) {
            case 'on_payment':
                // Payment was successful - create or renew subscription
                result = await processSubscriptionEvent(eventData);
                break;
                
            case 'on_rebill_cancelled':
                // Recurring payment was cancelled
                const orderId = eventData.order_id || eventData.orderId || eventData.order_id_digi;
                if (orderId) {
                    await cancelSubscription(orderId);
                    result = { success: true, action: 'cancelled' };
                } else {
                    result = { success: false, error: 'No order ID found for cancellation' };
                }
                break;
                
            case 'on_refund':
                // Refund was processed - cancel subscription
                const refundOrderId = eventData.order_id || eventData.orderId || eventData.order_id_digi;
                if (refundOrderId) {
                    await cancelSubscription(refundOrderId);
                    result = { success: true, action: 'refunded' };
                } else {
                    result = { success: false, error: 'No order ID found for refund' };
                }
                break;
                
            case 'on_chargeback':
                // Chargeback occurred - cancel subscription
                const chargebackOrderId = eventData.order_id || eventData.orderId || eventData.order_id_digi;
                if (chargebackOrderId) {
                    await cancelSubscription(chargebackOrderId);
                    result = { success: true, action: 'chargeback' };
                } else {
                    result = { success: false, error: 'No order ID found for chargeback' };
                }
                break;
                
            case 'on_payment_missed':
                // Payment missed - could be temporary, log but don't cancel
                result = { success: true, action: 'payment_missed', message: 'Payment missed - subscription remains active' };
                break;
                
            case 'on_rebill_resumed':
                // Recurring payment resumed - reactivate subscription
                result = await processSubscriptionEvent(eventData);
                break;
                
            case 'last_paid_day':
                // Last paid period ended - cancel subscription
                const lastPaidOrderId = eventData.order_id || eventData.orderId || eventData.order_id_digi;
                if (lastPaidOrderId) {
                    await cancelSubscription(lastPaidOrderId);
                    result = { success: true, action: 'last_paid_day' };
                } else {
                    result = { success: false, error: 'No order ID found for last_paid_day' };
                }
                break;
                
            case 'payment_denial':
                // Payment was denied - cancel subscription
                const deniedOrderId = eventData.order_id || eventData.orderId || eventData.order_id_digi;
                if (deniedOrderId) {
                    await cancelSubscription(deniedOrderId);
                    result = { success: true, action: 'payment_denied' };
                } else {
                    result = { success: false, error: 'No order ID found for payment denial' };
                }
                break;
                
            default:
                // Try to process as payment event anyway
                try {
                    console.log(`Processing unknown event type '${eventType}' as payment event`);
                    result = await processSubscriptionEvent(eventData);
                    eventType = 'payment_processed';
                    console.log('Successfully processed unknown event as payment');
                } catch (err) {
                    console.log('Could not process as payment event:', err.message);
                    console.log('Event data that failed:', JSON.stringify(eventData, null, 2));
                    result = { 
                        success: false, 
                        error: 'Unknown event type', 
                        eventType: eventType,
                        debug: {
                            availableFields: Object.keys(eventData),
                            eventData: eventData
                        }
                    };
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
            await logIPN(req.body || {}, 'error', error.message);
        } catch (logError) {
            console.error('Failed to log IPN error:', logError);
        }
        
        // Always return 200 to Digistore24 to prevent retries
        return res.status(200).json({ 
            success: false,
            error: 'Internal server error',
            message: error.message,
            timestamp: new Date().toISOString()
        });
    }
}
