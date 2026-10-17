import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) throw new Error('Please define the MONGODB_URI environment variable');

let cached = global.mongoose;
if (!cached) cached = global.mongoose = { conn: null, promise: null };

export async function connectToDatabase() {
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false }).then((mongoose) => mongoose);
  }
  cached.conn = await cached.promise;
  return cached.conn;
}

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  sku: { type: String, required: true, unique: true },
  price: { type: Number, required: true },
  quantity: { type: Number, required: true, default: 0 }
});

const transactionSchema = new mongoose.Schema({
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: Number,
    price: Number
  }],
  totalAmount: { type: Number, required: true },
  paymentMethod: { type: String, enum: ['Cash', 'M-Pesa'], required: true },
  status: { type: String, enum: ['Pending', 'Completed', 'Failed'], default: 'Pending' },
  checkoutRequestId: { type: String }, // Maps M-Pesa STK to this transaction
  mpesaReceiptNumber: { type: String },
  mpesaPhone: { type: String },
  timestamp: { type: Date, default: Date.now }
});

export const Product = mongoose.models.Product || mongoose.model('Product', productSchema);
export const Transaction = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
