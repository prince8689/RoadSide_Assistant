// ============================================
// AI CHATBOT MODULE — CONTROLLER
// ============================================

const aiService = require('./ai.service');
const { success } = require('../../utils/apiResponse');
const { AppError } = require('../../middleware/errorHandler');

/**
 * Handle new chat message / image upload from user
 */
const chat = async (req, res, next) => {
    try {
        const { text, imageBase64 } = req.body;
        const userId = req.user.id;

        if (!text && !imageBase64) {
            throw new AppError('Message text or image is required', 400);
        }

        const response = await aiService.handleChat(userId, text, imageBase64);

        return success(res, response, 'AI responded successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get list of past conversations
 */
const getConversations = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const conversations = await aiService.getUserConversations(userId);
        
        return success(res, { conversations }, 'Conversations retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Get messages for a specific conversation
 */
const getMessages = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { conversationId } = req.params;
        
        const messages = await aiService.getConversationMessages(userId, conversationId);
        
        return success(res, { messages }, 'Messages retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * [ADMIN] Get all conversations
 */
const getAllConversations = async (req, res, next) => {
    try {
        const conversations = await aiService.getAllConversations();
        return success(res, { conversations }, 'All conversations retrieved successfully');
    } catch (error) {
        next(error);
    }
};

module.exports = {
    chat,
    getConversations,
    getMessages,
    getAllConversations
};
