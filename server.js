const express = require('express');
const cors = require('cors');
const axios = require('axios');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const http = require('http');
const socketIo = require('socket.io');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

// Import models
const User = require('./models/User');
const Call = require('./models/Call');
const Conversation = require('./models/Conversation');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.static('public'));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use(limiter);

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/rexbot_db')
.then(() => console.log('✅ Connected to MongoDB'))
.catch(err => {
  console.error('❌ MongoDB connection error:', err);
  console.log('⚠️  Running in demo mode without database');
});

// Authentication middleware
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid token' });
  }
};

// RexBot character prompt
const REXBOT_PROMPT = `You are RexBot, a professional AI receptionist. Your personality is:

1. Be professional, friendly, and helpful
2. Use formal but warm language
3. Ask relevant questions to understand visitor needs
4. Collect necessary information for appointments
5. Be efficient and direct
6. Show empathy and understanding
7. Guide visitors through the process professionally

Always respond as RexBot, maintaining your professional receptionist personality while being helpful and efficient.`;

/**
 * Generate chatbot response using Gemini AI API
 */
async function generateResponse(message, conversationId) {
  try {
    // Get conversation history from database
    const conversation = await Conversation.findOne({ sessionId: conversationId });
    const messages = conversation ? conversation.messages.slice(-10) : [];

    // Gemini AI API endpoint and key
    const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent';
    const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

    // Check if API key is configured or quota exceeded
    if (!GEMINI_API_KEY || GEMINI_API_KEY === 'your_gemini_api_key_here') {
      const fallbackResponses = [
        "Hello! I'm RexBot, your AI receptionist. How may I assist you today?",
        "Welcome! I'm here to help you. What brings you here today?",
        "Good day! I'm RexBot, ready to assist you. How can I help?",
        "Hello there! I'm your AI receptionist. What can I do for you today?",
        "Welcome! I'm RexBot. How may I be of service to you?"
      ];
      
      return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    // Prepare request body for Google Gemini API
    const requestBody = {
      "contents": [
        {
          "role": "user",
          "parts": [
            {
              "text": `${REXBOT_PROMPT}\n\nConversation history:\n${messages.map(msg => `${msg.sender}: ${msg.content}`).join('\n')}\n\nUser: ${message}`
            }
          ]
        }
      ],
      "generationConfig": {
        "temperature": 0.7,
        "maxOutputTokens": 200
      }
    };

    // Call Gemini AI API
    const response = await axios.post(`${GEMINI_API_URL}?key=${GEMINI_API_KEY}`, requestBody, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    return response.data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error generating response:', error);
    if (error.response) {
      console.error('API Error Response:', error.response.data);
      console.error('API Error Status:', error.response.status);
      
      // Handle quota exceeded error
      if (error.response.status === 429) {
        const fallbackResponses = [
          "I understand your request. Let me help you with that. Could you please provide more details?",
          "Thank you for reaching out. I'm here to assist you. What specific information do you need?",
          "I appreciate your inquiry. Let me guide you through this process. What would you like to know?",
          "Hello! I'm here to help. Could you please clarify your request so I can assist you better?",
          "Thank you for contacting us. I'm ready to help you with your needs. What can I do for you?"
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
      }
    }
    return 'I apologize, but I\'m experiencing some technical difficulties. Please try again in a moment.';
  }
}

// Socket.IO connection handling
const connectedUsers = new Map();
const waitingCalls = new Map();

// In-memory storage for demo mode
const demoUsers = new Map();
const demoConversations = new Map();
const demoCalls = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  // Staff login
  socket.on('staff-login', async (data) => {
    try {
      const { email, password } = data;
      const user = await User.findOne({ email, role: 'staff' });
      
      if (!user || !await bcrypt.compare(password, user.password)) {
        socket.emit('login-error', { message: 'Invalid credentials' });
        return;
      }

      user.isAvailable = true;
      user.lastActive = new Date();
      await user.save();

      connectedUsers.set(socket.id, user);
      socket.emit('login-success', { user: { id: user._id, name: user.name, department: user.department } });
      
      // Notify about waiting calls
      const waitingCallCount = await Call.countDocuments({ status: 'waiting' });
      socket.emit('waiting-calls', { count: waitingCallCount });
    } catch (error) {
      socket.emit('login-error', { message: 'Login failed' });
    }
  });

  // Client starts conversation
  socket.on('start-conversation', async (data) => {
    try {
      const { name, email, purpose } = data;
      
      // Check if MongoDB is connected
      if (mongoose.connection.readyState === 1) {
        // Use MongoDB
        let user = await User.findOne({ email });
        if (!user) {
          user = new User({
            name,
            email,
            password: await bcrypt.hash(Math.random().toString(), 10),
            role: 'client'
          });
          await user.save();
        }

        // Create conversation
        const sessionId = socket.id;
        const conversation = new Conversation({
          userId: user._id,
          sessionId,
          messages: [{
            sender: 'system',
            content: `New conversation started by ${name} - Purpose: ${purpose}`,
            messageType: 'system'
          }]
        });
        await conversation.save();

        // Create call request
        const call = new Call({
          clientId: user._id,
          purpose,
          status: 'waiting'
        });
        await call.save();

        waitingCalls.set(socket.id, call);
        connectedUsers.set(socket.id, user);

        // Notify all staff about new call
        io.emit('new-call-request', {
          callId: call._id,
          clientName: name,
          purpose,
          timestamp: new Date()
        });

        socket.emit('conversation-started', { 
          sessionId, 
          callId: call._id,
          name: name,
          purpose: purpose
        });
      } else {
        // Use in-memory storage for demo mode
        const sessionId = socket.id;
        const userId = `demo_${Date.now()}`;
        
        // Create demo user
        const demoUser = {
          _id: userId,
          name,
          email,
          role: 'client'
        };
        demoUsers.set(userId, demoUser);
        
        // Create demo conversation
        const demoConversation = {
          sessionId,
          userId,
          messages: [{
            sender: 'system',
            content: `New conversation started by ${name} - Purpose: ${purpose}`,
            messageType: 'system'
          }]
        };
        demoConversations.set(sessionId, demoConversation);
        
        // Create demo call
        const demoCall = {
          _id: `call_${Date.now()}`,
          clientId: userId,
          purpose,
          status: 'waiting',
          createdAt: new Date()
        };
        demoCalls.set(sessionId, demoCall);
        
        connectedUsers.set(socket.id, demoUser);
        
        // Notify all staff about new call
        io.emit('new-call-request', {
          callId: demoCall._id,
          clientName: name,
          purpose,
          timestamp: new Date()
        });

        socket.emit('conversation-started', { 
          sessionId, 
          callId: demoCall._id,
          name: name,
          purpose: purpose
        });
      }
    } catch (error) {
      console.error('Error starting conversation:', error);
      socket.emit('error', { message: 'Failed to start conversation: ' + error.message });
    }
  });

  // Staff accepts call
  socket.on('accept-call', async (data) => {
    try {
      const { callId } = data;
      const staffUser = connectedUsers.get(socket.id);
      
      if (!staffUser || staffUser.role !== 'staff') {
        return;
      }

      const call = await Call.findById(callId);
      if (!call || call.status !== 'waiting') {
        return;
      }

      call.staffId = staffUser._id;
      call.status = 'in-progress';
      call.startTime = new Date();
      await call.save();

      // Find client socket
      const clientSocketId = Array.from(waitingCalls.entries())
        .find(([id, c]) => c._id.toString() === callId)?.[0];

      if (clientSocketId) {
        io.to(clientSocketId).emit('call-accepted', {
          staffName: staffUser.name,
          staffDepartment: staffUser.department
        });
        waitingCalls.delete(clientSocketId);
      }

      socket.emit('call-started', { callId, clientId: call.clientId });
    } catch (error) {
      socket.emit('error', { message: 'Failed to accept call' });
    }
  });

  // Video call signaling
  socket.on('offer', (data) => {
    const { target, offer } = data;
    io.to(target).emit('offer', { offer, from: socket.id });
  });

  socket.on('answer', (data) => {
    const { target, answer } = data;
    io.to(target).emit('answer', { answer, from: socket.id });
  });

  socket.on('ice-candidate', (data) => {
    const { target, candidate } = data;
    io.to(target).emit('ice-candidate', { candidate, from: socket.id });
  });

  // Call decision
  socket.on('call-decision', async (data) => {
    try {
      const { callId, decision, notes } = data;
      const staffUser = connectedUsers.get(socket.id);
      
      if (!staffUser || staffUser.role !== 'staff') {
        return;
      }

      const call = await Call.findById(callId);
      if (!call || call.staffId.toString() !== staffUser._id.toString()) {
        return;
      }

      call.status = 'completed';
      call.endTime = new Date();
      call.decision = decision;
      call.notes = notes;
      call.duration = Math.floor((call.endTime - call.startTime) / 1000);
      await call.save();

      // Notify client
      const clientSocketId = Array.from(connectedUsers.entries())
        .find(([id, user]) => user._id.toString() === call.clientId.toString())?.[0];

      if (clientSocketId) {
        io.to(clientSocketId).emit('call-completed', { decision, notes });
      }

      socket.emit('decision-saved', { callId, decision });
    } catch (error) {
      socket.emit('error', { message: 'Failed to save decision' });
    }
  });

  // Chat messages
  socket.on('chat-message', async (data) => {
    try {
      const { sessionId, message } = data;
      const user = connectedUsers.get(socket.id);
      
      if (!user) return;

      // Save user message
      const conversation = await Conversation.findOne({ sessionId });
      if (conversation) {
        conversation.messages.push({
          sender: 'user',
          content: message,
          messageType: 'text'
        });
        await conversation.save();
      }

      // Generate AI response
      const aiResponse = await generateResponse(message, sessionId);
      
      // Save AI response
      if (conversation) {
        conversation.messages.push({
          sender: 'rexbot',
          content: aiResponse,
          messageType: 'text'
        });
        await conversation.save();
      }

      socket.emit('ai-response', { response: aiResponse });
    } catch (error) {
      socket.emit('error', { message: 'Failed to process message' });
    }
  });

  // Disconnect
  socket.on('disconnect', async () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      if (user.role === 'staff') {
        user.isAvailable = false;
        user.lastActive = new Date();
        await user.save();
      }
      connectedUsers.delete(socket.id);
    }
    
    const call = waitingCalls.get(socket.id);
    if (call) {
      call.status = 'rejected';
      await call.save();
      waitingCalls.delete(socket.id);
    }

    console.log('User disconnected:', socket.id);
  });
});

// API Routes

// Authentication routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role, department } = req.body;
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, parseInt(process.env.BCRYPT_ROUNDS) || 12);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      role,
      department
    });
    await user.save();

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    
    if (!user || !await bcrypt.compare(password, user.password)) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Protected routes
app.get('/api/calls/waiting', authenticateToken, async (req, res) => {
  try {
    const calls = await Call.find({ status: 'waiting' })
      .populate('clientId', 'name email')
      .sort({ createdAt: 1 });
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch waiting calls' });
  }
});

app.get('/api/calls/my-calls', authenticateToken, async (req, res) => {
  try {
    const calls = await Call.find({ staffId: req.user._id })
      .populate('clientId', 'name email')
      .sort({ createdAt: -1 });
    res.json(calls);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch calls' });
  }
});

app.get('/api/staff/available', async (req, res) => {
  try {
    const staff = await User.find({ role: 'staff', isAvailable: true })
      .select('name department lastActive');
    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch available staff' });
  }
});

// Staff interface route
app.get('/staff', (req, res) => {
  res.sendFile(__dirname + '/public/staff.html');
});

// Staff registration route
app.get('/register', (req, res) => {
  res.sendFile(__dirname + '/public/register.html');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'RexBot AI Reception System',
    connectedUsers: connectedUsers.size,
    waitingCalls: waitingCalls.size
  });
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 RexBot AI Reception System running on port ${PORT}`);
  console.log(`📱 Client Interface: http://localhost:${PORT}`);
  console.log(`👥 Staff Interface: http://localhost:${PORT}/staff`);
  console.log(`🔧 API health check: http://localhost:${PORT}/api/health`);
  
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (GEMINI_API_KEY && GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    console.log(`🤖 Full AI mode enabled with Gemini API`);
  } else {
    console.log(`⚠️  Note: Running in demo mode. Set GEMINI_API_KEY in .env for full AI functionality.`);
  }
});

module.exports = app;
