import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '../../api/axios';

const PaymentModal = ({ requestId, onClose, onSuccess }) => {
  const [paymentMethod, setPaymentMethod] = useState('online');
  const [receiptFile, setReceiptFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (paymentMethod === 'online' && !receiptFile) {
      toast.error('Please upload a payment receipt.');
      return;
    }

    const formData = new FormData();
    formData.append('payment_method', paymentMethod);
    if (paymentMethod === 'online' && receiptFile) {
      formData.append('receipt', receiptFile);
    }

    setIsSubmitting(true);
    try {
      await api.post(`/requests/${requestId}/submit-payment`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      toast.success('Payment submitted for verification!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to submit payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fade-in">
      <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-slide-up relative flex flex-col">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-black text-dark tracking-tight">Complete Payment</h2>
            <button 
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 hover:text-dark transition"
            >
              ✕
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
              <p className="font-semibold text-gray-700">Select Payment Method</p>
              <div className="flex gap-4">
                <label className={`flex-1 border-2 p-4 rounded-xl cursor-pointer transition flex flex-col items-center justify-center gap-2 font-bold ${paymentMethod === 'online' ? 'border-primary bg-orange-50 text-primary scale-105 shadow-md' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" name="paymentMethod" value="online" checked={paymentMethod === 'online'} onChange={() => setPaymentMethod('online')} className="hidden" />
                  <span className="text-2xl">💳</span>
                  UPI / Online
                </label>
                <label className={`flex-1 border-2 p-4 rounded-xl cursor-pointer transition flex flex-col items-center justify-center gap-2 font-bold ${paymentMethod === 'cash' ? 'border-primary bg-orange-50 text-primary scale-105 shadow-md' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
                  <input type="radio" name="paymentMethod" value="cash" checked={paymentMethod === 'cash'} onChange={() => setPaymentMethod('cash')} className="hidden" />
                  <span className="text-2xl">💵</span>
                  Pay Cash
                </label>
              </div>
            </div>

            {paymentMethod === 'online' && (
              <div className="space-y-3 animate-fade-in">
                <p className="font-semibold text-gray-700">Upload Payment Receipt</p>
                <div className="border-2 border-dashed border-gray-300 p-6 rounded-xl text-center hover:bg-gray-50 transition cursor-pointer relative group">
                  <input type="file" accept="image/*,.pdf" onChange={(e) => setReceiptFile(e.target.files[0])} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" required />
                  {receiptFile ? (
                    <div className="text-green-600 font-bold flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-3xl mb-3 shadow-inner">✅</div>
                      {receiptFile.name}
                      <span className="text-xs text-gray-400 mt-2 font-normal">Click to change file</span>
                    </div>
                  ) : (
                    <div className="text-gray-500 flex flex-col items-center group-hover:text-primary transition">
                      <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-3xl mb-3 group-hover:bg-orange-100 transition shadow-inner">📄</div>
                      <p className="font-bold text-dark group-hover:text-primary">Click to upload receipt</p>
                      <p className="text-sm mt-1">Supports Images & PDF</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {paymentMethod === 'cash' && (
              <div className="bg-blue-50 border border-blue-200 p-5 rounded-2xl animate-fade-in flex items-start gap-3">
                <span className="text-xl">ℹ️</span>
                <div>
                  <p className="text-sm font-bold text-blue-900 mb-1">Cash Payment</p>
                  <p className="text-sm text-blue-800">
                    You have selected Cash. Please hand the required amount to the mechanic. The job will be completed once the mechanic verifies the payment.
                  </p>
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isSubmitting} 
              className="w-full btn-primary py-4 text-lg mt-4 shadow-lg shadow-orange-200 flex justify-center items-center gap-2 relative overflow-hidden"
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Submitting...
                </>
              ) : 'Submit Payment'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;
