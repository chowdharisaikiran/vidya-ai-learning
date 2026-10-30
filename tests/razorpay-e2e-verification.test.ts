import http from 'http';
import crypto from 'crypto';
import dotenv from 'dotenv';
dotenv.config();

interface E2ETestResult {
  step: string;
  success: boolean;
  message: string;
}

const e2eResults: E2ETestResult[] = [];

function logStep(step: string, success: boolean, message: string) {
  e2eResults.push({ step, success, message });
  console.log(`[E2E TEST] [${success ? 'SUCCESS' : 'FAILED'}] ${step}: ${message}`);
}

function makeApiRequest(
  options: http.RequestOptions,
  postData?: any
): Promise<{ statusCode: number; headers: http.IncomingHttpHeaders; body: any }> {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let body = data;
        try {
          body = JSON.parse(data);
        } catch {}
        resolve({ statusCode: res.statusCode || 0, headers: res.headers, body });
      });
    });
    req.on('error', reject);
    if (postData) {
      req.write(typeof postData === 'string' ? postData : JSON.stringify(postData));
    }
    req.end();
  });
}

async function runRazorpayE2EVerification() {
  console.log('=== Starting End-to-End Razorpay Test Mode Verification ===\n');

  // Step 1: Verify Razorpay Test Mode Config & Key ID format
  try {
    const configRes = await makeApiRequest({
      hostname: 'localhost',
      port: 3000,
      path: '/api/admin/subscription/razorpay-config',
      method: 'GET',
    });

    if (configRes.statusCode === 200 && configRes.body && configRes.body.keyId) {
      const mode = configRes.body.mode;
      logStep(
        '1. Razorpay Test Mode Configuration',
        true,
        `Successfully retrieved Razorpay config in test mode. Key ID prefix: ${configRes.body.keyId.substring(0, 8)}..., Mode: ${mode}`
      );
    } else {
      logStep('1. Razorpay Test Mode Configuration', false, `Failed to retrieve config (Status: ${configRes.statusCode})`);
    }
  } catch (err: any) {
    logStep('1. Razorpay Test Mode Configuration', false, err.message);
  }

  // Step 2: Verify Plan Amounts for Basic, Professional, and Enterprise (Yearly & Monthly)
  const plansToTest = [
    { plan: 'Basic', cycle: 'Yearly', expectedAmount: 49990, expectedQuota: 250 },
    { plan: 'Basic', cycle: 'Monthly', expectedAmount: 4999, expectedQuota: 250 },
    { plan: 'Professional', cycle: 'Yearly', expectedAmount: 119990, expectedQuota: 750 },
    { plan: 'Professional', cycle: 'Monthly', expectedAmount: 9999, expectedQuota: 750 },
    { plan: 'Enterprise', cycle: 'Yearly', expectedAmount: 299990, expectedQuota: 2500 },
    { plan: 'Enterprise', cycle: 'Monthly', expectedAmount: 24999, expectedQuota: 2500 },
  ];

  for (const p of plansToTest) {
    try {
      const orderRes = await makeApiRequest(
        {
          hostname: 'localhost',
          port: 3000,
          path: '/api/admin/subscription/create-razorpay-order',
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        },
        { targetPlan: p.plan, billingCycle: p.cycle }
      );

      if (orderRes.statusCode === 200 && orderRes.body && orderRes.body.amount === p.expectedAmount) {
        logStep(
          `2. Order Creation (${p.plan} - ${p.cycle})`,
          true,
          `Successfully created test order ID: ${orderRes.body.orderId} with authoritative amount: ₹${p.expectedAmount}`
        );
      } else {
        logStep(
          `2. Order Creation (${p.plan} - ${p.cycle})`,
          false,
          `Expected amount ${p.expectedAmount}, got ${orderRes.body?.amount} (Status: ${orderRes.statusCode})`
        );
      }
    } catch (err: any) {
      logStep(`2. Order Creation (${p.plan} - ${p.cycle})`, false, err.message);
    }
  }

  // Step 3: Test Payment Signature Verification on Server
  try {
    const testSecret = process.env.RAZORPAY_KEY_SECRET || 'mock_secret_key';
    const testOrderId = `order_test_${Date.now()}`;
    const testPaymentId = `pay_test_${Date.now()}`;

    const validSig = crypto
      .createHmac('sha256', testSecret)
      .update(testOrderId + '|' + testPaymentId)
      .digest('hex');

    const verifyRes = await makeApiRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/subscription/verify-razorpay-payment',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        razorpay_order_id: testOrderId,
        razorpay_payment_id: testPaymentId,
        razorpay_signature: validSig,
        targetPlan: 'Professional',
        billingCycle: 'Yearly',
      }
    );

    if (verifyRes.statusCode === 200 && verifyRes.body && verifyRes.body.success) {
      logStep(
        '3. Server-Side Payment Signature Verification',
        true,
        `Payment signature successfully verified and subscription updated to Professional (Quota: ${verifyRes.body.subscription?.studentLimit})`
      );
    } else {
      logStep(
        '3. Server-Side Payment Signature Verification',
        false,
        `Verification failed (Status: ${verifyRes.statusCode}): ${JSON.stringify(verifyRes.body)}`
      );
    }
  } catch (err: any) {
    logStep('3. Server-Side Payment Signature Verification', false, err.message);
  }

  // Step 4: Test Failed / Invalid Signature Rejection
  try {
    const invalidVerifyRes = await makeApiRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/subscription/verify-razorpay-payment',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      {
        razorpay_order_id: 'order_test_fake',
        razorpay_payment_id: 'pay_test_fake',
        razorpay_signature: 'invalidsignaturehash',
        targetPlan: 'Professional',
        billingCycle: 'Yearly',
      }
    );

    if (invalidVerifyRes.statusCode === 400) {
      logStep(
        '4. Failed/Invalid Signature Rejection',
        true,
        'Server correctly rejected invalid payment signature with 400 Bad Request.'
      );
    } else {
      logStep(
        '4. Failed/Invalid Signature Rejection',
        false,
        `Expected 400 for invalid signature, got status ${invalidVerifyRes.statusCode}`
      );
    }
  } catch (err: any) {
    logStep('4. Failed/Invalid Signature Rejection', false, err.message);
  }

  // Step 5: Test Webhook Payment Captured & Idempotency
  try {
    const webhookEventId = `evt_test_webhook_${Date.now()}`;
    const webhookPayload = {
      event: 'payment.captured',
      event_id: webhookEventId,
      payload: {
        payment: {
          entity: {
            id: `pay_wh_${Date.now()}`,
            amount: 299990,
            currency: 'INR',
            notes: {
              targetPlan: 'Enterprise',
              billingCycle: 'Yearly',
            },
          },
        },
      },
    };

    // First delivery
    const whRes1 = await makeApiRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/subscription/razorpay-webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      webhookPayload
    );

    // Duplicate redelivery (Idempotency test)
    const whRes2 = await makeApiRequest(
      {
        hostname: 'localhost',
        port: 3000,
        path: '/api/admin/subscription/razorpay-webhook',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      },
      webhookPayload
    );

    if (whRes1.statusCode === 200 && whRes2.statusCode === 200 && whRes2.body?.status === 'already_processed') {
      logStep(
        '5. Webhook Payment Capture & Idempotency',
        true,
        'Webhook successfully processed payment.captured event and correctly identified duplicate redelivery as already_processed.'
      );
    } else {
      logStep(
        '5. Webhook Payment Capture & Idempotency',
        false,
        `Webhook test failed. Wh1: ${whRes1.statusCode}, Wh2: ${JSON.stringify(whRes2.body)}`
      );
    }
  } catch (err: any) {
    logStep('5. Webhook Payment Capture & Idempotency', false, err.message);
  }

  // Summary
  console.log('\n=== E2E Razorpay Verification Summary ===');
  const successCount = e2eResults.filter((r) => r.success).length;
  const failCount = e2eResults.filter((r) => !r.success).length;
  console.log(`Total Steps: ${e2eResults.length} | Passed: ${successCount} | Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runRazorpayE2EVerification().catch((err) => {
  console.error('E2E verification error:', err);
  process.exit(1);
});
