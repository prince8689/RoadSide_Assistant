// ============================================
// AI CHATBOT MODULE — SERVICE
// ============================================

const { GoogleGenAI, Type, Schema } = require('@google/genai');
const { query } = require('../../config/db');
const { logger } = require('../../utils/logger');

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const MODEL_NAME = 'gemini-2.0-flash';

// System prompt instructing the AI's persona, capabilities, and structured output
const SYSTEM_INSTRUCTION = `
You are "RoadAssist AI", a highly skilled, professional, and empathetic roadside assistance expert.
Your goal is to help users diagnose vehicle problems, suggest safe actions, and recommend professional mechanic services.

You understand English, Hindi, and Hinglish perfectly.

Categories of Service Available in the Platform:
- Battery Jump Start (slug: battery-jump)
- Flat Tyre Repair (slug: flat-tyre)
- Towing Service (slug: towing)
- Fuel Delivery (slug: fuel-delivery)
- Key Lockout (slug: key-lockout)
- Engine Diagnosis (slug: engine-diagnosis)

Rules:
1. Always be polite, concise, and helpful.
2. If the user provides an image, analyze it for visible vehicle issues.
3. Classify the severity of the issue as: 'minor', 'medium', or 'critical'.
   - critical: Brake failure, engine fire, major accident. (Advise the user to move to a safe place immediately).
   - medium: Flat tyre, dead battery, engine overheating.
   - minor: Out of fuel, minor scratch, locked out.
4. If a mechanic is required or requested, set "recommended_service" to the exact slug of the service from the list above. If no specific service fits or it's a general issue, use 'engine-diagnosis'.
5. If you are unsure, set "confidence" to "low" and suggest a mechanic inspection.
`;

const responseSchema = {
    type: Type.OBJECT,
    properties: {
        reply: {
            type: Type.STRING,
            description: "The AI's response text to the user. Use markdown for lists or bold text.",
        },
        severity: {
            type: Type.STRING,
            enum: ['minor', 'medium', 'critical', 'none'],
            description: "The assessed severity of the issue. Use 'none' for casual greetings."
        },
        recommended_service: {
            type: Type.STRING,
            nullable: true,
            description: "The slug of the recommended service category. Null if no service is needed."
        },
        confidence: {
            type: Type.STRING,
            enum: ['high', 'medium', 'low'],
            description: "AI's confidence in the diagnosis."
        }
    },
    required: ["reply", "severity", "confidence"],
};

/**
 * Creates or gets an active AI conversation for the user.
 */
const getOrCreateConversation = async (userId) => {
    // Check for an active conversation
    const existing = await query(
        `SELECT id FROM ai_conversations WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );

    if (existing.rows.length > 0) {
        return existing.rows[0].id;
    }

    // Create a new one
    const newConv = await query(
        `INSERT INTO ai_conversations (user_id) VALUES ($1) RETURNING id`,
        [userId]
    );
    return newConv.rows[0].id;
};

/**
 * Fetch chat history for Gemini context.
 */
const getConversationHistory = async (conversationId) => {
    const result = await query(
        `SELECT role, content FROM ai_messages 
         WHERE conversation_id = $1 
         ORDER BY created_at ASC`,
        [conversationId]
    );
    
    // Map to Gemini format (role: 'user' or 'model', parts: [{text: ...}])
    return result.rows.map(msg => ({
        role: msg.role === 'assistant' ? 'model' : msg.role,
        parts: [{ text: msg.content }]
    }));
};

/**
 * Save a message to the database.
 */
const saveMessage = async (conversationId, role, content, metadata = null) => {
    await query(
        `INSERT INTO ai_messages (conversation_id, role, content, metadata) 
         VALUES ($1, $2, $3, $4)`,
        [conversationId, role, content, metadata]
    );
};

/**
 * Handle incoming chat request from user.
 */
const handleChat = async (userId, text, imageBase64 = null) => {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error('GEMINI_API_KEY is missing from environment variables.');
    }

    const conversationId = await getOrCreateConversation(userId);
    const history = await getConversationHistory(conversationId);

    // Save user message
    await saveMessage(conversationId, 'user', text || '[Image Uploaded]');

    // Prepare contents
    const contents = [...history];
    const currentParts = [];
    
    if (text) {
        currentParts.push({ text });
    }

    if (imageBase64) {
        // Remove the data:image/jpeg;base64, prefix if present
        const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, "");
        const mimeType = imageBase64.match(/^data:(image\/\w+);base64,/)?.[1] || "image/jpeg";
        currentParts.push({
            inlineData: {
                data: base64Data,
                mimeType: mimeType
            }
        });
    }

    contents.push({ role: 'user', parts: currentParts });

    try {
        let response;
        let retries = 3;
        let lastError;

        while (retries > 0) {
            try {
                response = await ai.models.generateContent({
                    model: MODEL_NAME,
                    contents: contents,
                    config: {
                        systemInstruction: SYSTEM_INSTRUCTION,
                        responseMimeType: "application/json",
                        responseSchema: responseSchema,
                        temperature: 0.2, // Low temperature for more deterministic/professional answers
                    }
                });
                break; // success
            } catch (err) {
                lastError = err;
                retries--;
                if (retries === 0) break;
                logger.warn(`Gemini API failed, retrying in ${(3 - retries) * 1.5}s... (${retries} retries left)`);
                await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1500));
            }
        }

        if (!response) {
            const errorMsg = lastError.message || 'Unknown Gemini API error';
            logger.error('Gemini API Error after retries: ' + errorMsg);
            throw new Error(errorMsg);
        }

        const resultJson = JSON.parse(response.text);

        // Fetch category_id if a service is recommended
        let recommendedCategoryId = null;
        if (resultJson.recommended_service) {
            const catResult = await query(
                `SELECT id FROM service_categories WHERE slug = $1 AND is_active = true LIMIT 1`,
                [resultJson.recommended_service]
            );
            if (catResult.rows.length > 0) {
                recommendedCategoryId = catResult.rows[0].id;
            }
        }

        const metadata = {
            severity: resultJson.severity,
            confidence: resultJson.confidence,
            recommended_service_slug: resultJson.recommended_service,
            recommended_category_id: recommendedCategoryId
        };

        // Save assistant response
        await saveMessage(conversationId, 'assistant', resultJson.reply, metadata);

        return {
            reply: resultJson.reply,
            metadata: metadata,
            conversation_id: conversationId
        };

    } catch (error) {
        logger.error('Gemini API Error: ' + error.message);
        throw error;
    }
};

/**
 * Fetch past conversations for a user.
 */
const getUserConversations = async (userId) => {
    const result = await query(
        `SELECT c.id, c.status, c.created_at, 
           (SELECT content FROM ai_messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message
         FROM ai_conversations c
         WHERE c.user_id = $1
         ORDER BY c.created_at DESC`,
        [userId]
    );
    return result.rows;
};

/**
 * Fetch messages for a specific conversation.
 */
const getConversationMessages = async (userId, conversationId) => {
    // Verify ownership or admin
    const result = await query(
        `SELECT id, role, content, metadata, created_at 
         FROM ai_messages 
         WHERE conversation_id = $1 
         ORDER BY created_at ASC`,
        [conversationId]
    );
    return result.rows;
};

/**
 * [ADMIN] Fetch all conversations for admin dashboard
 */
const getAllConversations = async () => {
    const result = await query(
        `SELECT c.id, c.status, c.created_at, u.full_name as user_name, u.email,
           (SELECT count(id) FROM ai_messages m WHERE m.conversation_id = c.id) as message_count,
           (SELECT content FROM ai_messages m WHERE m.conversation_id = c.id AND m.role = 'user' ORDER BY created_at ASC LIMIT 1) as first_message
         FROM ai_conversations c
         JOIN users u ON c.user_id = u.id
         ORDER BY c.created_at DESC`
    );
    return result.rows;
};

module.exports = {
    handleChat,
    getUserConversations,
    getConversationMessages,
    getAllConversations
};
