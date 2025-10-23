import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }

  try {
    if (req.method !== 'POST') {
      throw new Error('Method not allowed');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { orderId, phoneNumber, amount } = await req.json();

    if (!orderId || !phoneNumber || !amount) {
      throw new Error('Missing required parameters');
    }

    // Validate phone number format
    const phoneRegex = /^254\d{9}$/;
    if (!phoneRegex.test(phoneNumber)) {
      throw new Error('Invalid phone number format. Must start with 254 followed by 9 digits');
    }

    // Fetch M-Pesa configuration
    const { data: configData, error: configError } = await supabase
      .from('mpesa_configs')
      .select('*')
      .single();

    if (configError || !configData) {
      throw new Error('M-Pesa configuration not found');
    }

    // Generate timestamp
    const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, -3);
    
    // Generate password
    const password = btoa(
      `${configData.business_shortcode}${configData.passkey}${timestamp}`
    );

    try {
      // Get access token
      const tokenResponse = await fetch(
        'https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials',
        {
          headers: {
            Authorization: `Basic ${btoa(
              `${configData.consumer_key}:${configData.consumer_secret}`
            )}`,
          },
        }
      );

      if (!tokenResponse.ok) {
        throw new Error('Failed to get access token');
      }

      const { access_token } = await tokenResponse.json();

      // Initiate STK Push
      const stkPushResponse = await fetch(
        'https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            BusinessShortCode: configData.business_shortcode,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phoneNumber,
            PartyB: configData.business_shortcode,
            PhoneNumber: phoneNumber,
            CallBackURL: `${Deno.env.get('SUPABASE_URL')}/functions/v1/mpesa-callback`,
            AccountReference: orderId,
            TransactionDesc: 'Payment for order',
          }),
        }
      );

      if (!stkPushResponse.ok) {
        const errorText = await stkPushResponse.text();
        throw new Error(`STK push failed: ${errorText}`);
      }

      const stkPushResult = await stkPushResponse.json();

      if (stkPushResult.ResponseCode === '0') {
        // Record transaction
        await supabase.from('mpesa_transactions').insert({
          order_id: orderId,
          checkout_request_id: stkPushResult.CheckoutRequestID,
          merchant_request_id: stkPushResult.MerchantRequestID,
          phone_number: phoneNumber,
          amount: amount,
          reference_number: orderId,
          description: 'Payment for order',
        });

        return new Response(
          JSON.stringify({
            success: true,
            message: 'Payment request sent. Please check your phone.',
            data: stkPushResult,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      } else {
        throw new Error(stkPushResult.ResponseDescription || 'STK push failed');
      }
    } catch (fetchError) {
      console.error('Fetch error:', fetchError);
      throw new Error(`M-Pesa API error: ${fetchError.message}`);
    }
  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        message: error.message || 'Internal server error',
      }),
      {
        status: error.message.includes('Method not allowed') ? 405 : 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});