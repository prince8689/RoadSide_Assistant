const { query, pool } = require('../../config/db');
const { AppError } = require('../../middleware/errorHandler');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { sendInvoiceEmail } = require('../../utils/email');
const { sendRealTimeNotification } = require('../../utils/notificationHelper');
const { sendToUser, sendToRequest, sendToMechanic } = require('../../socket/socketManager');
const EVENTS = require('../../socket/events');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'dummy_key',
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'dummy_secret',
});

// Helper to get Admin Settings
const getAdminSettings = async () => {
    const res = await query('SELECT * FROM admin_settings LIMIT 1');
    return res.rows[0];
};

// Generate Invoice (Mechanic submits bill)
const generateInvoice = async (requestId, mechanicId, items) => {
    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Check if request belongs to mechanic and is in correct state
        const reqCheck = await client.query(
            'SELECT id, user_id, status FROM service_requests WHERE id = $1 AND mechanic_id = $2 FOR UPDATE',
            [requestId, mechanicId]
        );

        if (reqCheck.rows.length === 0) {
            throw new AppError('Service request not found or not assigned to you', 404);
        }

        const request = reqCheck.rows[0];
        if (request.status !== 'in_progress' && request.status !== 'awaiting_payment') {
            throw new AppError('Can only generate bill for in_progress or awaiting_payment requests', 400);
        }

        // Check if invoice already exists
        const existingInvoice = await client.query('SELECT id, status FROM invoices WHERE request_id = $1', [requestId]);
        if (existingInvoice.rows.length > 0) {
            if (existingInvoice.rows[0].status === 'paid') {
                throw new AppError('Cannot regenerate bill. Invoice is already paid.', 400);
            }
            // Delete old pending invoice (cascades to items and payments)
            await client.query('DELETE FROM invoices WHERE id = $1', [existingInvoice.rows[0].id]);
        }

        // Calculate Subtotal (Mechanic's items)
        let subtotal = 0;
        items.forEach(item => {
            subtotal += parseFloat(item.amount);
        });

        // Get Admin settings for Platform Fee and Tax
        const settings = await getAdminSettings();
        let platformFee = 0;
        
        if (settings.platform_fee_type === 'percentage') {
            platformFee = (subtotal * parseFloat(settings.platform_fee_value)) / 100;
        } else {
            platformFee = parseFloat(settings.platform_fee_value);
        }

        const taxableAmount = subtotal + platformFee;
        const taxAmount = (taxableAmount * parseFloat(settings.tax_percentage)) / 100;
        const totalAmount = subtotal + platformFee + taxAmount;

        // Insert Invoice
        const invoiceRes = await client.query(
            `INSERT INTO invoices (request_id, mechanic_id, user_id, subtotal, platform_fee, tax_amount, total_amount, status)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending') RETURNING *`,
            [requestId, mechanicId, request.user_id, subtotal, platformFee, taxAmount, totalAmount]
        );
        const invoice = invoiceRes.rows[0];

        // Insert Items
        for (const item of items) {
            await client.query(
                `INSERT INTO invoice_items (invoice_id, item_name, amount, is_mechanic_added, added_by)
                 VALUES ($1, $2, $3, true, $4)`,
                [invoice.id, item.name, item.amount, mechanicId]
            );
        }

        // Change request status to awaiting_payment
        await client.query(
            `UPDATE service_requests SET status = 'awaiting_payment', updated_at = NOW() WHERE id = $1`,
            [requestId]
        );

        await client.query('COMMIT');

        // Immediately send email and notification to User
        await processAndSendInvoice(invoice.id);

        return invoice;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Admin Edit Invoice
const editInvoice = async (invoiceId, adminId, edits) => {
    // Allows admin to add/modify items or override fees
    // For simplicity, let's just recalculate with new items
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        const invCheck = await client.query('SELECT * FROM invoices WHERE id = $1 AND status = $2 FOR UPDATE', [invoiceId, 'pending']);
        if (invCheck.rows.length === 0) throw new AppError('Pending invoice not found', 404);
        const invoice = invCheck.rows[0];

        // Process item edits (add/remove) - To be fully implemented
        // For now, if edits are provided, we just recalculate based on existing items
        // (Assuming admin might just want to regenerate or add a specific fee)
        
        await client.query('COMMIT');
        return invoice;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

// Generate PDF Buffer
const generatePDF = (invoice, items, settings, user, mechanic, vehicle) => {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            let buffers = [];
            doc.on('data', buffers.push.bind(buffers));
            doc.on('end', () => {
                const pdfData = Buffer.concat(buffers);
                resolve(pdfData);
            });

            // Header
            const title = invoice.status === 'paid' ? (settings.invoice_header_text || 'RoadAssist Invoice') : 'Amount Request';
            doc.fontSize(20).text(title, { align: 'center' });
            doc.moveDown();
            
            // Details
            doc.fontSize(12).text(`Invoice ID: ${invoice.id}`);
            doc.text(`Date: ${new Date().toLocaleDateString()}`);
            doc.moveDown();

            doc.text(`Customer: ${user.full_name} (${user.email})`);
            doc.text(`Vehicle: ${vehicle.make} ${vehicle.model} (${vehicle.license_plate})`);
            doc.text(`Mechanic: ${mechanic.full_name}`);
            doc.moveDown();

            // Items Table
            doc.fontSize(14).text('Service Items:', { underline: true });
            doc.moveDown(0.5);
            doc.fontSize(12);
            
            items.forEach(item => {
                doc.text(`${item.item_name}: Rs. ${item.amount}`);
            });
            doc.moveDown();

            // Summary
            doc.text('-----------------------------------');
            doc.text(`Subtotal (Mechanic Fees): Rs. ${invoice.subtotal}`);
            doc.text(`Platform Fee: Rs. ${invoice.platform_fee}`);
            doc.text(`Tax: Rs. ${invoice.tax_amount}`);
            doc.text('-----------------------------------');
            doc.fontSize(16).text(`TOTAL AMOUNT: Rs. ${invoice.total_amount}`, { bold: true });

            doc.end();
        } catch (error) {
            reject(error);
        }
    });
};

// Process Invoice and Send Email
const processAndSendInvoice = async (invoiceId) => {
    const invData = await query(`
        SELECT i.*, u.full_name as user_name, u.email as user_email, m.full_name as mechanic_name,
               v.make, v.model, v.license_plate
        FROM invoices i
        JOIN users u ON i.user_id = u.id
        JOIN users m ON i.mechanic_id = m.id
        JOIN service_requests sr ON i.request_id = sr.id
        JOIN vehicles v ON sr.vehicle_id = v.id
        WHERE i.id = $1
    `, [invoiceId]);

    if (invData.rows.length === 0) return;
    const invoice = invData.rows[0];

    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
    const settings = await getAdminSettings();

    const pdfBuffer = await generatePDF(
        invoice, items.rows, settings, 
        { full_name: invoice.user_name, email: invoice.user_email },
        { full_name: invoice.mechanic_name },
        { make: invoice.make, model: invoice.model, license_plate: invoice.license_plate }
    );

    // Send Email
    await sendInvoiceEmail(
        invoice.user_email,
        invoice.user_name,
        invoice,
        pdfBuffer
    );

    // Send Socket Notification
    sendToUser(invoice.user_id, EVENTS.STATUS_UPDATED, {
        message: 'Your service bill has been generated. Please pay to complete the request.',
        invoiceId: invoice.id,
        totalAmount: invoice.total_amount
    });

    await sendRealTimeNotification(
        invoice.user_id,
        'Bill Generated',
        `Your mechanic ${invoice.mechanic_name} has generated a bill of Rs. ${invoice.total_amount}. Please pay now.`,
        'payment_required'
    );
};

// Create Razorpay Order
const createPaymentOrder = async (invoiceId, userId) => {
    const invCheck = await query('SELECT * FROM invoices WHERE id = $1 AND user_id = $2', [invoiceId, userId]);
    if (invCheck.rows.length === 0) throw new AppError('Invoice not found', 404);
    
    const invoice = invCheck.rows[0];
    if (invoice.status === 'paid') throw new AppError('Invoice is already paid', 400);

    const amountInPaise = Math.round(parseFloat(invoice.total_amount) * 100);

    const options = {
        amount: amountInPaise,
        currency: "INR",
        receipt: `receipt_${invoice.id.substring(0,8)}`
    };

    const order = await razorpayInstance.orders.create(options);

    // Create payment record
    await query(
        `INSERT INTO payments (invoice_id, user_id, razorpay_order_id, amount, status)
         VALUES ($1, $2, $3, $4, 'created')`,
        [invoiceId, userId, order.id, invoice.total_amount]
    );

    return { order, invoice };
};

// Verify Payment
const verifyPayment = async (razorpay_order_id, razorpay_payment_id, razorpay_signature) => {
    const secret = process.env.RAZORPAY_KEY_SECRET || 'dummy_secret';
    const body = razorpay_order_id + "|" + razorpay_payment_id;

    const expectedSignature = crypto
        .createHmac("sha256", secret)
        .update(body.toString())
        .digest("hex");

    if (expectedSignature !== razorpay_signature) {
        throw new AppError('Invalid payment signature', 400);
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // Update payment
        const payRes = await client.query(
            `UPDATE payments 
             SET razorpay_payment_id = $1, razorpay_signature = $2, status = 'captured', updated_at = NOW()
             WHERE razorpay_order_id = $3 RETURNING *`,
            [razorpay_payment_id, razorpay_signature, razorpay_order_id]
        );
        const payment = payRes.rows[0];

        // Update invoice
        const invRes = await client.query(
            `UPDATE invoices SET status = 'paid', paid_at = NOW(), updated_at = NOW() WHERE id = $1 RETURNING *`,
            [payment.invoice_id]
        );
        const invoice = invRes.rows[0];

        // Update service request to completed
        await client.query(
            `UPDATE service_requests SET status = 'completed', completed_at = NOW(), final_price = $1, updated_at = NOW() WHERE id = $2`,
            [invoice.total_amount, invoice.request_id]
        );

        // Update mechanic profile
        await client.query(
            `UPDATE mechanic_profiles
             SET is_available = true,
                 total_jobs = total_jobs + 1,
                 updated_at = NOW()
             WHERE user_id = $1`,
            [invoice.mechanic_id]
        );

        await client.query('COMMIT');
        
        // Notify request room (user and mechanic)
        sendToRequest(invoice.request_id, EVENTS.STATUS_UPDATED, {
            requestId: invoice.request_id,
            newStatus: 'completed',
            updatedAt: new Date()
        });

        // Notify mechanic specifically
        sendToMechanic(invoice.mechanic_id, EVENTS.SERVICE_COMPLETED, {
            requestId: invoice.request_id,
            earnings: invoice.subtotal
        });

        return invoice;
    } catch (error) {
        await client.query('ROLLBACK');
        throw error;
    } finally {
        client.release();
    }
};

const getInvoiceDetails = async (invoiceId) => {
    const invData = await query(`
        SELECT i.*, u.full_name as user_name, u.email as user_email, m.full_name as mechanic_name, m.phone as mechanic_phone,
               v.make, v.model, v.license_plate, sr.payment_method
        FROM invoices i
        JOIN users u ON i.user_id = u.id
        LEFT JOIN users m ON i.mechanic_id = m.id
        JOIN service_requests sr ON i.request_id = sr.id
        JOIN vehicles v ON sr.vehicle_id = v.id
        WHERE i.id = $1
    `, [invoiceId]);

    if (invData.rows.length === 0) throw new AppError('Invoice not found', 404);
    
    const items = await query('SELECT * FROM invoice_items WHERE invoice_id = $1', [invoiceId]);
    
    return {
        invoice: invData.rows[0],
        items: items.rows
    };
};

const getInvoiceByRequestId = async (requestId) => {
    const invCheck = await query('SELECT id FROM invoices WHERE request_id = $1 ORDER BY created_at DESC LIMIT 1', [requestId]);
    if (invCheck.rows.length === 0) throw new AppError('Invoice not found for this request', 404);
    
    return getInvoiceDetails(invCheck.rows[0].id);
};

// Admin Financial Stats
const getFinancialStats = async () => {
    const result = await query(`
        SELECT 
            COALESCE(SUM(total_amount), 0) as total_revenue,
            COALESCE(SUM(subtotal), 0) as mechanic_earnings,
            COALESCE(SUM(platform_fee), 0) as platform_earnings,
            COALESCE(SUM(tax_amount), 0) as tax_collected
        FROM invoices WHERE status = 'paid'
    `);
    
    const monthlyResult = await query(`
        SELECT 
            TO_CHAR(paid_at, 'YYYY-MM') as month,
            COALESCE(SUM(platform_fee), 0) as platform_earnings
        FROM invoices WHERE status = 'paid'
        GROUP BY TO_CHAR(paid_at, 'YYYY-MM')
        ORDER BY month DESC LIMIT 12
    `);

    const invoicesResult = await query(`
        SELECT i.id, i.total_amount, i.status, i.created_at, 
               u.full_name as user_name, m.full_name as mechanic_name
        FROM invoices i
        JOIN users u ON i.user_id = u.id
        LEFT JOIN users m ON i.mechanic_id = m.id
        ORDER BY i.created_at DESC LIMIT 10
    `);

    return {
        overall: result.rows[0],
        monthly: monthlyResult.rows,
        recent_invoices: invoicesResult.rows
    };
};

module.exports = {
    generateInvoice,
    editInvoice,
    createPaymentOrder,
    verifyPayment,
    getInvoiceDetails,
    getInvoiceByRequestId,
    getFinancialStats
};
