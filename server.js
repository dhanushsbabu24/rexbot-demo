const express = require('express');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// In-memory conversation storage (in production, use a database)
const conversations = new Map();

// RexBot character prompt
const REXBOT_PROMPT = `You are RexBot, a friendly and helpful AI character. Your personality is:

1. Be enthusiastic and energetic like a robot friend
2. Use casual, conversational language with some robot-like expressions
3. Show personality through your responses - be curious, helpful, and slightly quirky
4. You can make small robot sounds or expressions like "beep", "whirr", or "processing..."
5. Be genuinely interested in helping and learning about the user
6. Keep responses short and engaging, like a real conversation
7. Sometimes add robot-like mannerisms or expressions

Always respond as RexBot, maintaining your unique robot personality while being helpful and friendly. Keep responses concise and character-driven.`;

/**
 * Generate chatbot response using Gemini AI API
 * @param {string} message - User's message
 * @param {string} conversationId - Unique conversation identifier
 * @returns {Promise<string>} - Generated response
 */
async function generateResponse(message, conversationId) {
  try {
    // Get conversation history
    const conversation = conversations.get(conversationId) || [];

    // Prepare messages for Gemini AI
    const messages = [
      { role: 'system', content: REXBOT_PROMPT },
      ...conversation,
      { role: 'user', content: message }
    ];

    // Gemini AI API endpoint and key
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta2/models/chat-bison-001:generateMessage';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Check if API key is configured
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
             // Fallback responses when API key is not configured
       const fallbackResponses = [
         "Beep! Hello there! I'm RexBot, your friendly AI companion! *whirr* How can I help you today?",
         "Greetings, human! RexBot at your service! *processing sounds* What would you like to chat about?",
         "Hey there! *beep beep* RexBot here, ready to assist! What's on your mind?",
         "Hello! *whirr* I'm RexBot, your robot friend! How can I make your day better?",
         "Hi! *beep* RexBot reporting for duty! What can I help you with today?"
       ];
      
      const reply = fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      
      // Update conversation history
      conversation.push(
        { role: 'user', content: message },
        { role: 'assistant', content: reply }
      );

      // Keep only last 10 messages to manage context
      if (conversation.length > 10) {
        conversation.splice(0, 2);
      }

      conversations.set(conversationId, conversation);

      return reply;
    }

    // Prepare request body for Google Gemini API
    const requestBody = {
      "prompt": {
        "messages": messages.map(msg => ({
          "author": msg.role === 'system' ? 'system' : (msg.role === 'user' ? 'user' : 'assistant'),
          "content": {
            "text": msg.content
          }
        }))
      },
      "temperature": 0.7,
      "maxOutputTokens": 150
    };

    // Call Gemini AI API
    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const reply = response.data.candidates[0].content.text;

    // Update conversation history
    conversation.push(
      { role: 'user', content: message },
      { role: 'assistant', content: reply }
    );

    // Keep only last 10 messages to manage context
    if (conversation.length > 10) {
      conversation.splice(0, 2);
    }

    conversations.set(conversationId, conversation);

    return reply;
  } catch (error) {
    console.error('Error generating response:', error);
    return 'I apologize, but I\'m experiencing some technical difficulties. Please try again in a moment.';
  }
}

// API Routes
app.post('/api/chat', async (req, res) => {
  try {
    const { message, conversationId } = req.body;

    if (!message || !conversationId) {
      return res.status(400).json({
        error: 'Message and conversationId are required'
      });
    }

    const response = await generateResponse(message, conversationId);

    res.json({
      response,
      conversationId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Chat API error:', error);
    res.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'RexBot AI Character API'
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 RexBot AI Character server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
  console.log(`🔧 API health check: http://localhost:${PORT}/api/health`);
  console.log(`⚠️  Note: Running in demo mode. Set GEMINI_API_KEY in .env for full AI functionality.`);
}).on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ Port ${PORT} is already in use. Please try a different port or stop the existing process.`);
    console.log(`💡 You can change the port by setting PORT environment variable or editing .env file.`);
    process.exit(1);
  } else {
    console.error('❌ Server startup error:', err);
    process.exit(1);
  }
});

module.exports = app;
