// Test script for IPN endpoint
const testIPN = async () => {
    const testData = {
        event: 'order.completed',
        product_id: '643746',
        order_id: 'TEST_ORDER_123',
        customer_email: 'test@example.com',
        customer_firstname: 'Test',
        customer_lastname: 'User',
        amount: '9.00',
        currency: 'EUR',
        status: 'completed',
        timestamp: new Date().toISOString()
    };

    try {
        const response = await fetch('http://localhost:3000/api/digistore-ipn', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(testData)
        });

        const result = await response.json();
        console.log('IPN Test Response:', result);
        console.log('Status Code:', response.status);
    } catch (error) {
        console.error('IPN Test Error:', error);
    }
};

// Run test
testIPN();
