// ============================================
// AI CHATBOT MODULE — ROUTES
// ============================================

const express = require('express');
const router = express.Router();
const aiController = require('./ai.controller');
const { authenticate, authorizeRoles } = require('../../middleware/auth');

// All AI routes require authentication
router.use(authenticate);

// [ADMIN] Get all conversations globally
router.get('/admin/conversations', authorizeRoles('admin'), aiController.getAllConversations);

// Chat with AI
router.post('/chat', aiController.chat);

// Get past conversations
router.get('/conversations', aiController.getConversations);

// Get messages for a specific conversation
router.get('/conversations/:conversationId/messages', aiController.getMessages);

module.exports = router;
