const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/mechanic/sections/MechanicHomePage.jsx');
let code = fs.readFileSync(filePath, 'utf8');

const importsToAdd = `
import { verifyPaymentThunk } from '../../../store/requestStore';
`;

// Wait, the mechanic panel doesn't use requestStore currently? It uses useMechanicStore!
// In MechanicHomePage.jsx it calls handleUpdateJobStatus with axiosInst.put. Let's see.

const addUI = `
                  {activeJob.status === 'awaiting_payment' && (
                    <div className="col-span-2 bg-orange-50 border border-orange-200 text-orange-700 font-bold py-3 rounded-xl flex items-center justify-center gap-2">
                      Waiting for Customer Payment...
                    </div>
                  )}

                  {activeJob.status === 'payment_verification' && (
                    <div className="col-span-2 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-bold text-blue-900 mb-2">Verify Online Payment</h4>
                      <p className="text-sm text-blue-700 mb-3">Customer has uploaded an online payment receipt. Please verify.</p>
                      {activeJob.payment_receipt_url && (
                        <a href={\`http://localhost:5001\${activeJob.payment_receipt_url}\`} target="_blank" rel="noreferrer" className="block w-full text-center bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 rounded-xl mb-2">
                          View Receipt
                        </a>
                      )}
                      <button 
                        onClick={async () => {
                          try {
                            await axiosInst.post(\`/requests/\${activeJob.id}/verify-payment\`);
                            toast.success('Payment verified! Job complete.');
                            fetchActiveJob();
                          } catch (err) {
                            toast.error('Failed to verify payment');
                          }
                        }}
                        className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 rounded-xl"
                      >
                        Approve Payment & Complete Job
                      </button>
                    </div>
                  )}
                  {activeJob.status === 'completed' && (
                    <div className="col-span-2 bg-green-50 text-green-700 font-bold py-3 rounded-xl flex items-center justify-center">
                      Job Completed
                    </div>
                  )}
`;

code = code.replace("{activeJob.status === 'in_progress' && (", addUI + "\n{activeJob.status === 'in_progress' && (");
// Wait, the button for 'in_progress' calls handleUpdateJobStatus('completed'). It should call handleUpdateJobStatus('awaiting_payment') now.
code = code.replace("onClick={() => handleUpdateJobStatus('completed')}", "onClick={() => handleUpdateJobStatus('awaiting_payment')}");
code = code.replace("<FiCheck size={20} /> Complete Job", "<FiCheck size={20} /> Request Payment");

fs.writeFileSync(filePath, code);
console.log('MechanicHomePage updated');
