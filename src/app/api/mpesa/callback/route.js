import { NextResponse } from 'next/server';
import { connectToDatabase, Product, Transaction } from '@/lib/db';

export async function POST(req) {
  // Security Check: Verify secret token in URL query params
  const { searchParams } = new URL(req.url);
  if (searchParams.get('token') !== process.env.CALLBACK_SECRET_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await connectToDatabase();
  const body = await req.json();
  const callbackData = body.Body.stkCallback;
  
  const { CheckoutRequestID, ResultCode, CallbackMetadata } = callbackData;

  try {
    const transaction = await Transaction.findOne({ checkoutRequestId: CheckoutRequestID });
    if (!transaction) return NextResponse.json({ ResultCode: 0, ResultDesc: "Tx not found but accepted" });

    if (ResultCode === 0) {
      // Payment Success: Extract receipt, mark complete, and deduct inventory
      const receipt = CallbackMetadata.Item.find(item => item.Name === 'MpesaReceiptNumber').Value;
      transaction.status = 'Completed';
      transaction.mpesaReceiptNumber = receipt;
      
      for (let item of transaction.items) {
        await Product.findByIdAndUpdate(item.product, { $inc: { quantity: -item.quantity } });
      }
    } else {
      // Payment Failed/Cancelled by user
      transaction.status = 'Failed';
    }

    await transaction.save();
    return NextResponse.json({ ResultCode: 0, ResultDesc: "Accepted" }); // Acknowledge Safaricom
  } catch (error) {
    console.error('Callback processing error:', error);
    return NextResponse.json({ ResultCode: 1, ResultDesc: "Internal Error" });
  }
}
