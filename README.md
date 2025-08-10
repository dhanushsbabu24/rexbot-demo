# Alexa AI Receptionist Chatbot

A sophisticated web-based chatbot that acts as a professional receptionist with natural speech synthesis, mimicking Alexa's voice style. Built with modern web technologies and OpenAI's GPT model.

## ✨ Features

- **🤖 AI-Powered Responses**: Uses OpenAI's GPT model for intelligent, contextual conversations
- **🗣️ Speech Synthesis**: Alexa-like voice responses using Web Speech API
- **💬 Conversation Memory**: Maintains context for natural follow-up questions
- **🎨 Modern UI**: Clean, responsive design with smooth animations
- **♿ Accessibility**: Full keyboard navigation and screen reader support
- **📱 Responsive**: Works seamlessly on desktop, tablet, and mobile devices
- **🔧 Modular Code**: Well-structured, extensible architecture

## 🚀 Quick Start

### Prerequisites

- Node.js (v16 or higher)
- OpenAI API key
- Modern web browser with speech synthesis support

### Installation

1. **Clone or download the project**
   ```bash
   git clone <repository-url>
   cd receptionist-chatbot
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env and add your OpenAI API key
   OPENAI_API_KEY=your_actual_api_key_here
   ```

4. **Start the server**
   ```bash
   # Development mode with auto-reload
   npm run dev
   
   # Production mode
   npm start
   ```

5. **Open your browser**
   Navigate to `http://localhost:3000`

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key (required) | - |
| `OPENAI_MODEL` | GPT model to use | `gpt-3.5-turbo` |
| `PORT` | Server port | `3000` |
| `NODE_ENV` | Environment mode | `development` |

### OpenAI API Setup

1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an account and get your API key
3. Add the key to your `.env` file
4. Ensure you have sufficient credits for API calls

## 🎯 Usage

### Basic Interaction

1. **Type your message** in the input field
2. **Press Enter** or click the send button
3. **Listen** to Alexa's voice response
4. **Continue the conversation** naturally

### Speech Controls

- **Toggle Speech**: Click the volume button to enable/disable speech
- **Visual Indicators**: See when Alexa is speaking
- **Auto-pause**: Speech pauses when switching browser tabs

### Keyboard Shortcuts

- `Enter`: Send message
- `Ctrl/Cmd + Enter`: Send message (alternative)
- `Escape`: Close error modal

## 🏗️ Architecture

### Backend (Node.js + Express)

- **Server**: Express.js with CORS and static file serving
- **AI Integration**: OpenAI API with conversation context management
- **Memory**: In-memory conversation storage (extensible to database)
- **API Endpoints**: RESTful chat API with health checks

### Frontend (Vanilla JavaScript)

- **UI Framework**: Pure HTML/CSS/JavaScript for maximum compatibility
- **Speech Synthesis**: Web Speech API with voice optimization
- **State Management**: Class-based architecture with event-driven design
- **Responsiveness**: CSS Grid and Flexbox for adaptive layouts

### Key Components

```
├── server.js          # Express server with OpenAI integration
├── public/
│   ├── index.html     # Main HTML interface
│   ├── styles.css     # Modern CSS with animations
│   └── script.js      # Frontend JavaScript logic
├── package.json       # Dependencies and scripts
└── .env              # Environment configuration
```

## 🔍 API Reference

### POST `/api/chat`

Send a message to the chatbot.

**Request Body:**
```json
{
  "message": "Hello, I need help with an appointment",
  "conversationId": "conv_1234567890_abc123"
}
```

**Response:**
```json
{
  "response": "Hello! I'd be happy to help you with your appointment. What date and time would you prefer?",
  "conversationId": "conv_1234567890_abc123",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

### GET `/api/health`

Check server status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "service": "Receptionist Chatbot API"
}
```

## 🎨 Customization

### Voice Settings

Modify speech parameters in `script.js`:

```javascript
// In the speak() method
utterance.rate = 0.9;    // Speed (0.1 - 10)
utterance.pitch = 1.1;   // Pitch (0 - 2)
utterance.volume = 0.9;  // Volume (0 - 1)
```

### Receptionist Personality

Update the system prompt in `server.js`:

```javascript
const RECEPTIONIST_PROMPT = `Your custom prompt here...`;
```

### UI Styling

Modify `styles.css` to change:
- Color scheme
- Typography
- Layout spacing
- Animation timing

## 🚀 Deployment

### Local Development

```bash
npm run dev
```

### Production

```bash
npm start
```

### Environment Considerations

- Set `NODE_ENV=production`
- Use environment-specific API keys
- Consider database storage for conversations
- Implement rate limiting for production use

## 🔒 Security

- **API Keys**: Never commit `.env` files to version control
- **Input Validation**: Server-side message validation
- **Rate Limiting**: Consider implementing for production
- **HTTPS**: Use SSL certificates in production

## 🧪 Testing

### Manual Testing

1. Test conversation flow
2. Verify speech synthesis
3. Check responsive design
4. Test accessibility features

### Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- Mobile browsers: Responsive design

## 🐛 Troubleshooting

### Common Issues

**Speech not working:**
- Check browser permissions
- Verify speech synthesis support
- Check console for errors

**API errors:**
- Verify OpenAI API key
- Check API quota/credits
- Review server logs

**UI issues:**
- Clear browser cache
- Check console for JavaScript errors
- Verify all files are loaded

### Debug Mode

Enable detailed logging:

```javascript
// In script.js
console.log('Debug info:', data);
```

## 📚 Dependencies

### Backend
- `express`: Web framework
- `cors`: Cross-origin resource sharing
- `dotenv`: Environment variable management
- `openai`: OpenAI API client

### Frontend
- `Font Awesome`: Icons
- `Google Fonts`: Typography
- `Web Speech API`: Speech synthesis (native)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Acknowledgments

- OpenAI for providing the GPT API
- Web Speech API for speech synthesis
- Font Awesome for beautiful icons
- Inter font family for modern typography

## 📞 Support

For issues and questions:
1. Check the troubleshooting section
2. Review console logs
3. Create an issue in the repository
4. Contact the development team

---

**Built with ❤️ using modern web technologies**
