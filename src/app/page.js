'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

export default function POS() {
  const [activeTab, setActiveTab] = useState('pos');
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  // Note: Add an API route for GET /api/inventory similar to checkout to fetch these
  useEffect(() => {
    // Mock inventory fetch for UI if DB is empty - replace with actual GET /api/inventory
    setInventory([
      { _id: '1', name: 'Unga wa Ugali', sku: 'UG-01', price: 230, quantity: 50 },
      { _id: '2', name: 'Cooking Oil 1L', sku: 'OIL-01', price: 350, quantity: 20 },
    ]);
  }, []);

  const addToCart = (product) => {
    if (product.quantity <= 0) return alert('Out of stock!');
    const existing = cart.find(item => item.product._id === product._id);
    if (existing) {
      if (existing.quantity >= product.quantity) return alert('Max stock reached');
      setCart(cart.map(item => item.product._id === product._id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { product, quantity: 1, price: product.price }]);
    }
  };

  const totalAmount = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return alert('Cart is empty');
    if (paymentMethod === 'M-Pesa' && phone.length < 10) return alert('Enter valid phone number');

    setLoading(true);
    try {
      const payload = {
        items: cart.map(i => ({ product: i.product._id, quantity: i.quantity, price: i.price })),
        totalAmount,
        paymentMethod,
        phone
      };

      await axios.post('/api/checkout', payload);
      alert(paymentMethod === 'M-Pesa' ? 'Check phone for M-Pesa PIN prompt!' : 'Cash Checkout Successful!');
      setCart([]);
      setPhone('');
    } catch (err) {
      alert('Checkout failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 text-black">
      <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden flex flex-col md:flex-row min-h-[80vh]">
        
        {/* Sidebar Nav */}
        <div className="md:w-1/4 bg-blue-900 text-white p-6">
          <h1 className="text-2xl font-bold mb-8">Duka POS</h1>
          <ul className="flex md:flex-col gap-2">
            <li className={`p-3 rounded cursor-pointer ${activeTab === 'pos' ? 'bg-blue-800' : 'hover:bg-blue-800/50'}`} onClick={() => setActiveTab('pos')}>Terminal</li>
            <li className={`p-3 rounded cursor-pointer ${activeTab === 'inventory' ? 'bg-blue-800' : 'hover:bg-blue-800/50'}`} onClick={() => setActiveTab('inventory')}>Inventory</li>
          </ul>
        </div>

        {/* Main Content */}
        <div className="md:w-3/4 p-6 w-full">
          {activeTab === 'pos' && (
            <div className="flex flex-col md:flex-row gap-6">
              {/* Product Grid */}
              <div className="md:w-2/3 grid grid-cols-2 lg:grid-cols-3 gap-4">
                {inventory.map(item => (
                  <div key={item._id} onClick={() => addToCart(item)} className="p-4 border rounded shadow-sm hover:border-blue-500 cursor-pointer transition-colors bg-white">
                    <h3 className="font-bold text-gray-800">{item.name}</h3>
                    <p className="text-green-600 font-semibold mt-1">KES {item.price}</p>
                    <p className="text-xs text-gray-500 mt-2">Stock: {item.quantity}</p>
                  </div>
                ))}
              </div>

              {/* Cart Pane */}
              <div className="md:w-1/3 bg-gray-50 p-5 border rounded-lg h-fit">
                <h2 className="text-xl font-bold border-b border-gray-200 pb-2 mb-4">Current Order</h2>
                <div className="min-h-[150px]">
                  {cart.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center mb-3 text-sm">
                      <span className="font-medium">{item.product.name} <span className="text-gray-500">x{item.quantity}</span></span>
                      <span>KES {item.price * item.quantity}</span>
                    </div>
                  ))}
                  {cart.length === 0 && <p className="text-gray-400 text-sm text-center italic mt-10">Cart is empty</p>}
                </div>
                
                <div className="border-t border-gray-200 pt-4 mt-4 font-bold text-lg flex justify-between">
                  <span>Total:</span>
                  <span className="text-green-600">KES {totalAmount}</span>
                </div>
                
                <div className="mt-6 space-y-3">
                  <select className="w-full p-2 border rounded bg-white" value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}>
                    <option value="Cash">Cash</option>
                    <option value="M-Pesa">M-Pesa</option>
                  </select>
                  
                  {paymentMethod === 'M-Pesa' && (
                    <input type="tel" placeholder="07XX XXX XXX" className="w-full p-2 border rounded" value={phone} onChange={e => setPhone(e.target.value)} />
                  )}
                  
                  <button onClick={handleCheckout} disabled={loading || cart.length === 0} className="w-full bg-green-600 text-white p-3 rounded font-bold hover:bg-green-700 disabled:bg-gray-400 transition-colors">
                    {loading ? 'Processing...' : 'Charge KES ' + totalAmount}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
