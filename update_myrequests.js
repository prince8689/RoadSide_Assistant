const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'client/src/pages/user/sections/MyRequestsPage.jsx');
let code = fs.readFileSync(filePath, 'utf8');

const invoiceBtn = `
                {req.status === 'completed' && req.invoice_url && (
                  <a 
                    href={\`http://localhost:5001\${req.invoice_url}\`} 
                    target="_blank" 
                    rel="noreferrer"
                    className="block w-full mt-3 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold py-2 rounded-lg text-center transition-colors"
                  >
                    View Invoice
                  </a>
                )}
`;

code = code.replace("{req.status === 'pending' && (", invoiceBtn + "\n{req.status === 'pending' && (");

fs.writeFileSync(filePath, code);
console.log('MyRequestsPage updated');
