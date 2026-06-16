const express = require('express');
const router = express.Router();
const billingController = require('./billing.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');

router.use(authenticate);

// Mechanic endpoints
router.post(
    '/request/:requestId/generate',
    authorizeRoles('mechanic'),
    billingController.generateInvoice
);

// Common endpoints
router.get(
    '/invoice/:invoiceId',
    authorizeRoles('user', 'mechanic', 'admin'),
    billingController.getInvoiceDetails
);

router.get(
    '/invoice/by-request/:requestId',
    authorizeRoles('user', 'mechanic', 'admin'),
    billingController.getInvoiceByRequestId
);

// User endpoints (Payment)
router.post(
    '/invoice/:invoiceId/order',
    authorizeRoles('user'),
    billingController.createPaymentOrder
);

router.post(
    '/payment/verify',
    authorizeRoles('user'),
    billingController.verifyPayment
);

// Admin endpoints
router.get(
    '/admin/stats',
    authorizeRoles('admin'),
    billingController.getFinancialStats
);

module.exports = router;
