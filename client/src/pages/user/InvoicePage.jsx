import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { FiDownload, FiArrowLeft } from 'react-icons/fi';
import PageTransition from '../../components/common/PageTransition';
import InvoiceTemplate from '../../components/billing/InvoiceTemplate';
import { downloadInvoiceAsPDF } from '../../utils/invoiceUtils';
import { getSocket } from '../../socket/socketClient';

const InvoicePage = () => {
  const { requestId } = useParams();
  const navigate = useNavigate();
  const [invoiceData, setInvoiceData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInvoice = async () => {
      try {
        const res = await api.get(`/billing/invoice/by-request/${requestId}`);
        setInvoiceData(res.data.data || res.data);
      } catch (err) {
        toast.error('Failed to load invoice');
        navigate(-1);
      } finally {
        setLoading(false);
      }
    };
    fetchInvoice();

    const socket = getSocket();
    let handleStatusUpdate;
    
    if (socket) {
      handleStatusUpdate = (data) => {
        if (data.requestId === requestId || data.invoiceId) {
          fetchInvoice();
        }
      };
      socket.on('request:status:updated', handleStatusUpdate);
    }

    return () => {
      if (socket && handleStatusUpdate) {
        socket.off('request:status:updated', handleStatusUpdate);
      }
    };
  }, [requestId, navigate]);

  if (loading) {
    return <div className="min-h-screen pt-24 text-center">Loading invoice details...</div>;
  }
  
  if (!invoiceData) return null;

  const { invoice, items } = invoiceData;

  // Map backend items to the format expected by the template
  const mapIcon = (name) => {
    const n = name.toLowerCase();
    if (n.includes('fuel')) return '⛽';
    if (n.includes('air')) return '💨';
    if (n.includes('tow')) return '🚛';
    if (n.includes('battery') || n.includes('jump')) return '🔋';
    if (n.includes('tire') || n.includes('tyre')) return '🛞';
    return '🔧';
  };

  const serviceItems = items.map(item => ({
    description: item.item_name,
    icon: mapIcon(item.item_name),
    amount: parseFloat(item.amount).toFixed(2)
  }));

  const templateProps = {
    invoiceId: invoice.id.substring(0, 8),
    date: new Date(invoice.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }),
    customer: { 
      name: invoice.user_name, 
      email: invoice.user_email 
    },
    vehicle: { 
      name: `${invoice.make} ${invoice.model}`, 
      registrationNumber: invoice.license_plate 
    },
    mechanic: { 
      name: invoice.mechanic_name 
    },
    serviceItems,
    subtotal: parseFloat(invoice.subtotal).toFixed(2),
    platformFee: parseFloat(invoice.platform_fee).toFixed(2),
    tax: parseFloat(invoice.tax_amount).toFixed(2),
    totalAmount: parseFloat(invoice.total_amount).toFixed(2),
    paymentStatus: invoice.status === 'paid' 
      ? `PAID - ${(invoice.payment_method || 'ONLINE').toUpperCase()}` 
      : invoice.status.toUpperCase()
  };

  return (
    <PageTransition>
      <div className="min-h-screen pt-24 pb-12 bg-light px-4">
        <style>
          {`
            @media print {
              body * { visibility: hidden; }
              #invoice-wrapper, #invoice-wrapper * { visibility: visible; }
              #invoice-wrapper {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                margin: 0;
                padding: 0;
              }
              .no-print { display: none !important; }
            }
          `}
        </style>
        
        <div className="max-w-[800px] mx-auto mb-6 flex justify-between items-center no-print">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center gap-2 text-gray-600 hover:text-dark transition font-medium"
          >
            <FiArrowLeft /> Back
          </button>
          
          {invoice.status === 'paid' && (
            <button 
              onClick={() => downloadInvoiceAsPDF(invoice.id)}
              className="flex items-center gap-2 bg-primary text-white font-bold py-3 px-6 rounded-xl hover:bg-orange-600 transition-all shadow-lg"
            >
              <FiDownload /> Download Invoice PDF
            </button>
          )}
        </div>

        <div id="invoice-wrapper" className="flex justify-center mb-8">
          <InvoiceTemplate {...templateProps} />
        </div>


      </div>
    </PageTransition>
  );
};

export default InvoicePage;
