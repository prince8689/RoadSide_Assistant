-- Add Billing and Payment Tables

-- Admin Settings
CREATE TABLE IF NOT EXISTS admin_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    platform_fee_type VARCHAR(20) DEFAULT 'percentage', -- 'flat' or 'percentage'
    platform_fee_value DECIMAL(10, 2) DEFAULT 10.00,
    tax_percentage DECIMAL(5, 2) DEFAULT 18.00, -- e.g., GST
    invoice_header_text TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default settings if not exists
INSERT INTO admin_settings (platform_fee_type, platform_fee_value, tax_percentage, invoice_header_text)
SELECT 'percentage', 10.00, 18.00, 'RoadAssist Official Invoice'
WHERE NOT EXISTS (SELECT 1 FROM admin_settings);

-- Invoices
CREATE TABLE IF NOT EXISTS invoices (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID REFERENCES service_requests(id) ON DELETE CASCADE,
    mechanic_id UUID REFERENCES users(id) ON DELETE SET NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    subtotal DECIMAL(10, 2) NOT NULL DEFAULT 0,
    platform_fee DECIMAL(10, 2) NOT NULL DEFAULT 0,
    tax_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
    
    status VARCHAR(20) DEFAULT 'pending', -- pending, paid, cancelled
    pdf_url TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP
);

-- Invoice Items
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    item_name VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    
    -- Tracks who added/modified this item
    is_mechanic_added BOOLEAN DEFAULT true,
    is_admin_added BOOLEAN DEFAULT false,
    added_by UUID REFERENCES users(id) ON DELETE SET NULL,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Payments
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    
    razorpay_order_id VARCHAR(100),
    razorpay_payment_id VARCHAR(100),
    razorpay_signature VARCHAR(255),
    
    amount DECIMAL(10, 2) NOT NULL,
    method VARCHAR(50), -- UPI, Card, Netbanking
    status VARCHAR(20) DEFAULT 'created', -- created, authorized, captured, failed
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
