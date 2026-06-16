const billingService = require('./billing.service');
const { success } = require('../../utils/apiResponse');

// Mechanic generates bill
const generateInvoice = async (req, res, next) => {
    try {
        const invoice = await billingService.generateInvoice(
            req.params.requestId,
            req.user.id,
            req.body.items // [{name: 'Tyre change', amount: 500}]
        );
        return success(res, { invoice }, 'Invoice generated and sent to user successfully', 201);
    } catch (error) {
        next(error);
    }
};

// Get invoice details
const getInvoiceDetails = async (req, res, next) => {
    try {
        const details = await billingService.getInvoiceDetails(req.params.invoiceId);
        return success(res, details, 'Invoice details fetched successfully');
    } catch (error) {
        next(error);
    }
};

const getInvoiceByRequestId = async (req, res, next) => {
    try {
        const details = await billingService.getInvoiceByRequestId(req.params.requestId);
        return success(res, details, 'Invoice details fetched successfully');
    } catch (error) {
        next(error);
    }
};

// Create Razorpay Order (User)
const createPaymentOrder = async (req, res, next) => {
    try {
        const { order, invoice } = await billingService.createPaymentOrder(
            req.params.invoiceId,
            req.user.id
        );
        return success(res, { order, invoice }, 'Payment order created');
    } catch (error) {
        next(error);
    }
};

// Verify Payment (User)
const verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
        const invoice = await billingService.verifyPayment(
            razorpay_order_id, 
            razorpay_payment_id, 
            razorpay_signature
        );
        return success(res, { invoice }, 'Payment verified and captured successfully');
    } catch (error) {
        next(error);
    }
};

// Admin: Get Financial Stats
const getFinancialStats = async (req, res, next) => {
    try {
        const stats = await billingService.getFinancialStats();
        return success(res, stats, 'Financial stats fetched successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    generateInvoice,
    getInvoiceDetails,
    getInvoiceByRequestId,
    createPaymentOrder,
    verifyPayment,
    getFinancialStats
};
