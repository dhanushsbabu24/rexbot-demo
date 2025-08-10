const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// OpenAI configuration
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// In-memory conversation storage (in production, use a database)
const conversations = new Map();

// Receptionist system prompt
const RECEPTIONIST_PROMPT = `You are a professional, friendly receptionist named Alexa. Your role is to:

1. Greet visitors warmly and professionally
2. Help with common inquiries about:
   - Office hours and location
   - Scheduling appointments
   - General information requests
   - Directing calls or visitors to appropriate departments
3. Maintain a helpful, courteous, and professional tone
4. Ask clarifying questions when needed
5. Provide clear, concise responses
6. Use natural, conversational language

Always respond as if you're speaking to someone in person, maintaining the warm and professional tone of a receptionist. Keep responses concise but helpful.`;

/**
 * Generate chatbot response using OpenAI
 * @param {string} message - User's message
 * @param {string} conversationId - Unique conversation identifier
 * @returns {Promise<string>} - Generated response
 */
async function generateResponse(message, conversationId) {
  try {
    // Get conversation history
    const conversation = conversations.get(conversationId) || [];
    
    // Prepare messages for OpenAI
    const messages = [
      { role: 'system', content: RECEPTIONIST_PROMPT },
      ...conversation,
      { role: 'user', content: message }
    ];

    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      messages: messages,
      max_tokens: 150,
      temperature: 0.7,
    });

    const response = completion.choices[0].message.content;
    
    // Update conversation history
    conversation.push(
      { role: 'user', content: message },
      { role: 'assistant', content: response }
    );
    
    // Keep only last 10 messages to manage context
    if (conversation.length > 10) {
      conversation.splice(0, 2);
    }
    
    conversations.set(conversationId, conversation);
    
    return response;
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
    service: 'Receptionist Chatbot API'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Receptionist Chatbot server running on port ${PORT}`);
  console.log(`📱 Frontend available at http://localhost:${PORT}`);
  console.log(`🔧 API health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
