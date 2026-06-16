import React from 'react';

const InvoiceTemplate = ({
  invoiceId,
  date,
  customer,
  vehicle,
  mechanic,
  serviceItems,
  subtotal,
  platformFee,
  tax,
  totalAmount,
  paymentStatus
}) => {
  // Styles based on requirements
  const colors = {
    primaryOrange: '#FF6B35',
    darkNavy: '#1A1A2E',
    mediumNavy: '#16213E',
    white: '#FFFFFF',
    lightGray: '#F8F9FA',
    borderGray: '#E9ECEF',
    textDark: '#212529',
    textMuted: '#6C757D',
    successGreen: '#28A745',
  };

  return (
    <div id="invoice-container" style={{
      fontFamily: "'Inter', sans-serif",
      backgroundColor: colors.white,
      width: '794px',
      maxWidth: '794px',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden',
      color: colors.textDark,
      boxShadow: '0 4px 30px rgba(0,0,0,0.15)',
      borderRadius: '12px',
      border: `2px solid ${colors.primaryOrange}`
    }}>
      
      {/* Background pattern */}
      <div style={{
        position: 'absolute',
        top: 0, left: 0,
        width: '100%', height: '100%',
        overflow: 'hidden',
        zIndex: 0,
        pointerEvents: 'none',
      }}>
        {/* Repeating icons grid */}
        {Array(80).fill(0).map((_, i) => (
          <span key={i} style={{
            position: 'absolute',
            fontSize: '28px',
            opacity: 0.04,
            transform: 'rotate(-20deg)',
            top: `${Math.floor(i / 8) * 120}px`,
            left: `${(i % 8) * 120}px`,
          }}>
            {['🚗','🏍️','🚛','🔧','🛞','⛽'][i % 6]}
          </span>
        ))}

        {/* Center watermark text */}
        <div style={{
          position: 'absolute',
          top: '50%', left: '50%',
          transform: 'translate(-50%, -50%) rotate(-30deg)',
          fontSize: '120px',
          fontWeight: 900,
          color: colors.darkNavy,
          opacity: 0.025,
          whiteSpace: 'nowrap',
          letterSpacing: '10px',
          zIndex: 0,
          pointerEvents: 'none',
        }}>
          RoadAssist
        </div>
      </div>

      {/* Invoice Content container */}
      <div style={{ position: 'relative', zIndex: 1 }}>
        
        {/* Header Section (Compact - max 80px) */}
        <div style={{
          background: 'linear-gradient(135deg, #1A1A2E 0%, #16213E 100%)',
          padding: '16px 32px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: colors.white, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '20px' }}>🚗</span> RoadAssist
            </div>
            <div style={{ fontSize: '12px', color: colors.primaryOrange, marginTop: '2px' }}>
              Emergency Service Partner
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: colors.white, letterSpacing: '3px' }}>
              INVOICE
            </div>
            <div style={{ fontSize: '12px', color: '#A0AEC0', marginTop: '2px' }}>
              #{invoiceId || 'N/A'} • {date || new Date().toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>
        
        {/* Orange Accent Strip */}
        <div style={{ height: '4px', backgroundColor: colors.primaryOrange, width: '100%' }}></div>

        {/* Billing Info Section */}
        <div style={{ padding: '24px 32px', display: 'flex', justifyContent: 'space-between', backgroundColor: colors.white }}>
          
          {/* Bill To */}
          <div style={{ width: '48%' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.primaryOrange, letterSpacing: '2px', marginBottom: '8px' }}>
              BILL TO
            </div>
            <div style={{ height: '2px', backgroundColor: colors.primaryOrange, width: '40px', marginBottom: '16px' }}></div>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: colors.textDark, marginBottom: '4px' }}>
              {customer?.name || 'Customer Name'}
            </div>
            <div style={{ fontSize: '13px', color: colors.textMuted, marginBottom: '8px' }}>
              {customer?.email || 'customer@email.com'}
            </div>
            <div style={{ fontSize: '13px', color: colors.textDark }}>
              <strong>Vehicle:</strong> {vehicle?.name || 'N/A'}
            </div>
            <div style={{ fontSize: '13px', color: colors.textDark }}>
              <strong>Reg:</strong> {vehicle?.registrationNumber || 'N/A'}
            </div>
          </div>

          {/* Service By */}
          <div style={{ width: '48%' }}>
            <div style={{ fontSize: '10px', fontWeight: 'bold', color: colors.primaryOrange, letterSpacing: '2px', marginBottom: '8px' }}>
              SERVICE BY
            </div>
            <div style={{ height: '2px', backgroundColor: colors.primaryOrange, width: '40px', marginBottom: '16px' }}></div>
            <div style={{ fontSize: '13px', color: colors.textDark, marginBottom: '4px' }}>
              <strong>Mechanic:</strong> {mechanic?.name || 'N/A'}
            </div>
            <div style={{ fontSize: '13px', color: colors.textDark, marginBottom: '4px' }}>
              <strong>Platform:</strong> RoadAssist
            </div>
            <div style={{ fontSize: '13px', color: colors.textDark, marginBottom: '16px' }}>
              <strong>Service Date:</strong> {date || new Date().toLocaleDateString('en-GB')}
            </div>
            <div style={{
              display: 'inline-block',
              backgroundColor: '#E6FFFA',
              color: '#319795',
              padding: '6px 12px',
              borderRadius: '20px',
              fontSize: '11px',
              fontWeight: 'bold',
              border: '1px solid #B2F5EA'
            }}>
              ✓ VERIFIED SERVICE
            </div>
          </div>
        </div>

        {/* Service Details Table */}
        <div style={{ padding: '0 32px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ backgroundColor: colors.darkNavy, color: colors.white, fontSize: '11px', textTransform: 'uppercase' }}>
                <th style={{ padding: '12px 16px', borderRadius: '8px 0 0 0', width: '5%' }}>#</th>
                <th style={{ padding: '12px 16px', width: '55%' }}>Service Description</th>
                <th style={{ padding: '12px 16px', width: '20%' }}>Qty</th>
                <th style={{ padding: '12px 16px', borderRadius: '0 8px 0 0', width: '20%', textAlign: 'right' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {serviceItems && serviceItems.length > 0 ? (
                serviceItems.map((item, index) => (
                  <tr key={index} style={{ 
                    backgroundColor: index % 2 === 0 ? colors.white : colors.lightGray,
                    borderBottom: `1px solid ${colors.borderGray}`
                  }}>
                    <td style={{ 
                      padding: '14px 16px', 
                      fontSize: '13px',
                      borderLeft: index === 0 ? `3px solid ${colors.primaryOrange}` : '3px solid transparent'
                    }}>
                      {index + 1}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: '500', color: colors.textDark }}>
                      <span style={{ marginRight: '8px' }}>{item.icon || '🔧'}</span> {item.description}
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '13px', color: colors.textMuted }}>1 unit</td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', fontWeight: 'bold', color: colors.textDark, textAlign: 'right' }}>
                      Rs. {item.amount}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ padding: '20px', textAlign: 'center', color: colors.textMuted }}>No service items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <div style={{ 
            width: '300px', 
            backgroundColor: colors.lightGray, 
            borderRadius: '12px', 
            border: `1px solid ${colors.borderGray}`,
            padding: '16px',
            margin: '0 32px 16px 0'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: colors.textMuted }}>
              <span>Subtotal:</span>
              <span>Rs. {subtotal}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '13px', color: colors.textMuted }}>
              <span>Platform Fee:</span>
              <span>Rs. {platformFee}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '13px', color: colors.textMuted }}>
              <span>Tax:</span>
              <span>Rs. {tax}</span>
            </div>
            
            <div style={{ borderTop: `1px dashed ${colors.borderGray}`, margin: '12px 0' }}></div>
            
            <div style={{ 
              backgroundColor: colors.darkNavy, 
              borderRadius: '8px', 
              padding: '12px 16px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <span style={{ color: colors.white, fontWeight: 'bold', fontSize: '12px' }}>TOTAL AMOUNT</span>
              <span style={{ color: colors.primaryOrange, fontWeight: 'bold', fontSize: '20px' }}>Rs. {totalAmount}</span>
            </div>
          </div>
        </div>

        {/* Payment Status Banner */}
        <div style={{
          backgroundColor: (paymentStatus === 'COMPLETED' || (paymentStatus && paymentStatus.includes('PAID'))) ? '#F0FFF4' : '#FFF5F5',
          border: `1px solid ${(paymentStatus === 'COMPLETED' || (paymentStatus && paymentStatus.includes('PAID'))) ? '#C6F6D5' : '#FED7D7'}`,
          borderLeft: `4px solid ${(paymentStatus === 'COMPLETED' || (paymentStatus && paymentStatus.includes('PAID'))) ? colors.successGreen : '#E53E3E'}`,
          margin: '0 32px 20px',
          padding: '12px 16px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ fontSize: '14px', fontWeight: '600', color: (paymentStatus === 'COMPLETED' || (paymentStatus && paymentStatus.includes('PAID'))) ? '#22543D' : '#742A2A', display: 'flex', alignItems: 'center', gap: '8px' }}>
            {(paymentStatus === 'COMPLETED' || (paymentStatus && paymentStatus.includes('PAID'))) ? '✅ Payment Status:' : '⏳ Payment Status:'}
          </div>
          <div style={{ 
            fontSize: '15px', 
            fontWeight: 'bold', 
            color: (paymentStatus === 'COMPLETED' || (paymentStatus && paymentStatus.includes('PAID'))) ? colors.successGreen : '#E53E3E'
          }}>
            {paymentStatus || 'PENDING'}
          </div>
        </div>

        {/* Footer Section */}
        <div style={{
          backgroundColor: colors.darkNavy,
          padding: '16px 32px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: colors.white, fontWeight: 'bold', fontSize: '14px' }}>🚗 RoadAssist</div>
            </div>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{ color: '#A0AEC0', fontSize: '11px', marginBottom: '2px' }}>📧 support@roadassist.com</div>
              <div style={{ color: '#A0AEC0', fontSize: '11px' }}>📞 1800-ROADHELP</div>
            </div>
            <div style={{ flex: 1, textAlign: 'right' }}>
              <div style={{ color: '#A0AEC0', fontSize: '11px', marginBottom: '2px' }}>🌐 www.roadassist.com</div>
              <div style={{ color: '#A0AEC0', fontSize: '11px' }}>Available 24/7</div>
            </div>
          </div>
          


      </div>
    </div>
  </div>
  );
};

export default InvoiceTemplate;
