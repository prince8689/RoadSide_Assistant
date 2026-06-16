import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiCheckCircle, FiDownload, FiCreditCard } from 'react-icons/fi';
import PageTransition from '../../components/common/PageTransition';

const PaymentPage = () => {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await api.get(`/billing/invoice/${invoiceId}`);
        setInvoiceData(res.data.data || res.data);
      } catch (err) {
        toast.error('Failed to load invoice');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();
  }, [invoiceId, navigate]);

  // Load Razorpay script dynamically
  const loadRazorpayScript = () => {
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  };

  const handlePayment = async () => {
    setProcessing(true);
    try {
      const res = await loadRazorpayScript();
      if (!res) {
        toast.error('Razorpay SDK failed to load. Are you online?');
        setProcessing(false);
        return;
      }

      // Create Order
      const orderRes = await api.post(`/billing/invoice/${invoiceId}/order`);
      const { order, invoice } = orderRes.data.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID || 'rzp_test_YOUR_KEY_HERE', // Use the environment variable
        amount: order.amount,
        currency: order.currency,
        name: 'RoadAssist',
        description: `Payment for Service Invoice #${invoiceId.substring(0,8)}`,
        order_id: order.id,
        handler: async function (response) {
          try {
            await api.post('/billing/payment/verify', {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
            });
            setPaymentSuccess(true);
            toast.success('Payment successful!');
          } catch (err) {
            toast.error('Payment verification failed');
          }
        },
        prefill: {
          name: invoiceData?.invoice?.user_name,
          email: invoiceData?.invoice?.user_email,
        },
        theme: {
          color: '#007BFF',
        },
      };

      const paymentObject = new window.Razorpay(options);
      paymentObject.open();

      paymentObject.on('payment.failed', function (response) {
        toast.error(response.error.description);
      });
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to initialize payment');
    } finally {
      setProcessing(false);
    }
  };

  if (loading) return <div className="min-h-screen pt-24 text-center">Loading payment details...</div>;
  if (!invoiceData) return null;

  const { invoice, items } = invoiceData;

  if (paymentSuccess || invoice.status === 'paid') {
    return (
      <PageTransition>
        <div className="min-h-screen pt-24 pb-12 bg-light px-4 flex justify-center items-center">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
            <FiCheckCircle className="text-6xl text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-dark mb-2">Payment Successful!</h2>
            <p className="text-gray-600 mb-6">Your payment of ₹{invoice.total_amount} has been processed successfully.</p>
            <button onClick={() => navigate('/dashboard')} className="btn-primary w-full py-3 mb-3">Return to Dashboard</button>
            <p className="text-xs text-gray-500">Your final PDF receipt has been sent to your email.</p>
          </div>
        </div>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12 bg-light px-4">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-dark mb-8 text-center">Complete Your Payment</h1>
          
          <div className="bg-white rounded-3xl overflow-hidden shadow-xl border border-gray-100 flex flex-col md:flex-row">
            {/* Invoice Details Side */}
            <div className="p-8 md:w-2/3 border-b md:border-b-0 md:border-r border-gray-100">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Invoice Details</h2>
                <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Pending</span>
              </div>
              
              <div className="space-y-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-xl text-sm">
                  <div className="grid grid-cols-2 gap-y-2">
                    <span className="text-gray-500">Invoice ID:</span>
                    <span className="font-medium text-right">#{invoice.id.substring(0,8)}</span>
                    <span className="text-gray-500">Mechanic:</span>
                    <span className="font-medium text-right">{invoice.mechanic_name}</span>
                    <span className="text-gray-500">Vehicle:</span>
                    <span className="font-medium text-right">{invoice.make} {invoice.model}</span>
                  </div>
                </div>
              </div>

              <h3 className="font-bold text-gray-700 mb-3 border-b pb-2">Service Breakdown</h3>
              <div className="space-y-3 mb-6">
                {items.map(item => (
                  <div key={item.id} className="flex justify-between text-gray-800">
                    <span>{item.item_name}</span>
                    <span className="font-medium">₹{item.amount}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-4 space-y-2 text-sm text-gray-600">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Platform Fee</span>
                  <span>₹{invoice.platform_fee}</span>
                </div>
                <div className="flex justify-between">
                  <span>Taxes</span>
                  <span>₹{invoice.tax_amount}</span>
                </div>
              </div>
            </div>

            {/* Payment Side */}
            <div className="p-8 md:w-1/3 bg-gray-50 flex flex-col justify-center items-center text-center">
              <p className="text-gray-500 font-medium mb-1">Total Amount Due</p>
              <h2 className="text-4xl font-bold text-dark mb-8">₹{invoice.total_amount}</h2>
              
              <button 
                onClick={handlePayment} 
                disabled={processing}
                className="btn-primary w-full py-4 text-lg flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
              >
                {processing ? 'Processing...' : (
                  <>
                    <FiCreditCard /> Pay Now
                  </>
                )}
              </button>
              
              <div className="mt-6 flex items-center gap-2 text-gray-400 text-xs">
                <span>Secured by</span>
                <img src="https://razorpay.com/assets/razorpay-logo.svg" alt="Razorpay" className="h-4 opacity-50" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default PaymentPage;
