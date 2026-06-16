const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/user/sections/TrackingPage.jsx');
let code = fs.readFileSync(filePath, 'utf8');

const importsToAdd = `
import { submitPaymentThunk } from '../../../store/requestStore';
import { FiUpload } from 'react-icons/fi';
`;
code = code.replace("import { motion, AnimatePresence } from 'framer-motion';", importsToAdd + "import { motion, AnimatePresence } from 'framer-motion';");

const stateToAdd = `
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [receiptFile, setReceiptFile] = useState(null);
  const [submittingPayment, setSubmittingPayment] = useState(false);

  const handlePaymentSubmit = async () => {
    if (paymentMethod === 'online' && !receiptFile) return toast.error('Please upload a payment receipt');
    setSubmittingPayment(true);
    try {
      await dispatch(submitPaymentThunk({ requestId: activeRequest.id, paymentMethod, receiptFile })).unwrap();
      toast.success(paymentMethod === 'cash' ? 'Cash payment recorded' : 'Receipt uploaded for verification');
      dispatch(fetchActiveRequestThunk());
    } catch (err) {
      toast.error('Failed to submit payment details');
    } finally {
      setSubmittingPayment(false);
    }
  };
`;
code = code.replace("const [submittingFeedback, setSubmittingFeedback] = useState(false);", "const [submittingFeedback, setSubmittingFeedback] = useState(false);\n" + stateToAdd);

const paymentUI = `
  if (activeRequest.status === 'awaiting_payment' || activeRequest.status === 'payment_verification') {
    return (
      <PageTransition>
        <div className="max-w-md mx-auto pt-8 px-4 text-center">
          <div className="w-24 h-24 bg-orange-100 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <FiCheckCircle size={48} />
          </div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Service Done</h2>
          <p className="text-gray-600 mb-8">Mechanic has completed the work. Please process the payment.</p>

          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 text-left">
            <h3 className="font-bold text-lg mb-4 text-center">Payment Details</h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
              <select 
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                disabled={activeRequest.status === 'payment_verification'}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="cash">Cash</option>
                <option value="online">Online / UPI</option>
              </select>
            </div>
            
            {paymentMethod === 'online' && activeRequest.status === 'awaiting_payment' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Upload Receipt Screenshot</label>
                <input 
                  type="file" 
                  accept="image/*,.pdf"
                  onChange={(e) => setReceiptFile(e.target[0] || e.target.files[0])}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-primary hover:file:bg-orange-100"
                />
              </div>
            )}

            {activeRequest.status === 'payment_verification' ? (
              <div className="bg-blue-50 text-blue-700 p-4 rounded-xl text-center text-sm font-medium">
                Wait, Mechanic is verifying your payment receipt...
              </div>
            ) : (
              <button 
                onClick={handlePaymentSubmit}
                disabled={submittingPayment}
                className="w-full bg-primary hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                {submittingPayment ? 'Submitting...' : 'Submit Payment Info'}
              </button>
            )}
          </div>
        </div>
      </PageTransition>
    );
  }
`;

code = code.replace("if (activeRequest.status === 'completed') {", paymentUI + "\n  if (activeRequest.status === 'completed') {");

const stepArrayCode = `const STEPS = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'awaiting_payment', 'payment_verification', 'completed'];
const STEP_LABELS = ['Requested', 'Accepted', 'En Route', 'Arrived', 'In Progress', 'Payment', 'Verification', 'Completed'];`;

code = code.replace("const STEPS = ['pending', 'accepted', 'en_route', 'arrived', 'in_progress', 'completed'];", stepArrayCode);
code = code.replace("const STEP_LABELS = ['Requested', 'Accepted', 'En Route', 'Arrived', 'In Progress', 'Completed'];", "");

fs.writeFileSync(filePath, code);
console.log('TrackingPage updated');
