import { NextResponse } from 'next/server';
import { connectToDatabase, Product, Transaction } from '@/lib/db';
import axios from 'axios';
import moment from 'moment';

async function getMpesaToken() {
  const auth = Buffer.from(`${process.env.MPESA_CONSUMER_KEY}:${process.env.MPESA_CONSUMER_SECRET}`).toString('base64');
  const { data } = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
    headers: { Authorization: `Basic ${auth}` }
  });
  return data.access_token;
}

export async function POST(req) {
  await connectToDatabase();
  const { items, totalAmount, paymentMethod, phone } = await req.json();

  try {
    if (paymentMethod === 'Cash') {
      // Cash: Deduct stock immediately and complete
      const transaction = await Transaction.create({ items, totalAmount, paymentMethod, status: 'Completed' });
      for (let item of items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
      }
      return NextResponse.json({ success: true, transaction });
    } 
    
    if (paymentMethod === 'M-Pesa') {
      // M-Pesa: Create pending transaction, DO NOT deduct stock yet
      const formattedPhone = phone.startsWith('0') ? `254${phone.substring(1)}` : phone;
      const transaction = await Transaction.create({ items, totalAmount, paymentMethod, status: 'Pending', mpesaPhone: formattedPhone });

      const token = await getMpesaToken();
      const shortcode = process.env.MPESA_SHORTCODE;
      const passkey = process.env.MPESA_PASSKEY;
      const timestamp = moment().format('YYYYMMDDHHmmss');
      const password = Buffer.from(`${shortcode}${passkey}${timestamp}`).toString('base64');

      const { data } = await axios.post('https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest', {
        BusinessShortCode: shortcode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: totalAmount,
        PartyA: formattedPhone,
        PartyB: shortcode,
        PhoneNumber: formattedPhone,
        CallBackURL: process.env.MPESA_CALLBACK_URL,
        AccountReference: `POS-${transaction._id.toString().slice(-6)}`,
        TransactionDesc: 'POS Purchase'
      }, { headers: { Authorization: `Bearer ${token}` } });

      // Save the CheckoutRequestID to match the callback later
      transaction.checkoutRequestId = data.CheckoutRequestID;
      await transaction.save();

      return NextResponse.json({ success: true, message: 'STK Push Sent', checkoutRequestId: data.CheckoutRequestID });
    }
  } catch (error) {
    console.error(error.response?.data || error.message);
    return NextResponse.json({ error: 'Checkout failed' }, { status: 500 });
  }
}
