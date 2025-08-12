/**
 * RexBot AI Reception System - Client Script
 */

class RexBot {
    constructor() {
        this.socket = io();
        this.conversationId = null;
        this.sessionId = null;
        this.speechRecognition = null;
        this.speechSynthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeechEnabled = true;
        this.isTyping = false;
        this.isConversationStarted = false;
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.setupEventListeners();
        this.setupSocketListeners();
        this.setWelcomeTime();
        this.setupKeyboardShortcuts();
    }

    initializeElements() {
        // Chat elements
        this.chatMessages = document.getElementById('chatMessages');
        this.speechInputButton = document.getElementById('speechInputButton');
        this.micIcon = document.getElementById('micIcon');
        this.speechStatusDisplay = document.getElementById('speechStatusDisplay');
        this.speechToggle = document.getElementById('speechToggle');
        this.speechIcon = document.getElementById('speechIcon');
        this.speechStatus = document.getElementById('speechStatus');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        
        // Error handling
        this.errorModal = document.getElementById('errorModal');
        this.errorTitle = document.getElementById('errorTitle');
        this.errorMessage = document.getElementById('errorMessage');
        this.closeError = document.getElementById('closeError');
    }

    initializeSpeechRecognition() {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            this.speechRecognition = new SpeechRecognition();
            
            this.speechRecognition.continuous = false;
            this.speechRecognition.interimResults = false;
            this.speechRecognition.lang = 'en-US';
            
            this.speechRecognition.onstart = () => {
                this.isListening = true;
                this.speechInputButton.classList.add('recording');
                this.micIcon.className = 'fas fa-stop';
                this.speechStatusDisplay.textContent = 'Listening...';
                this.speechStatusDisplay.classList.add('listening');
                this.updateStatus('Listening...', 'listening');
            };
            
            this.speechRecognition.onresult = (event) => {
                const transcript = event.results[0][0].transcript;
                this.speechStatusDisplay.textContent = `Heard: "${transcript}"`;
                this.sendMessage(transcript);
            };
            
            this.speechRecognition.onerror = (event) => {
                console.error('Speech recognition error:', event.error);
                this.showError(`Speech recognition error: ${event.error}`);
                this.resetSpeechInput();
            };
            
            this.speechRecognition.onend = () => {
                this.resetSpeechInput();
            };
        } else {
            console.warn('Speech recognition not supported');
            this.speechInputButton.style.display = 'none';
            this.showError('Speech recognition is not supported in your browser. Please use a modern browser like Chrome or Edge.');
        }
    }

    setupEventListeners() {
        // Speech input button
        this.speechInputButton.addEventListener('click', () => {
            if (!this.isConversationStarted) {
                this.startConversation();
                return;
            }
            
            if (this.isListening) {
                this.speechRecognition.stop();
            } else {
                this.startSpeechRecognition();
            }
        });

        // Speech toggle
        this.speechToggle.addEventListener('click', () => {
            this.toggleSpeech();
        });

        // Error modal
        if (this.closeError) {
            this.closeError.addEventListener('click', () => {
                this.closeErrorModal();
            });
        }

        // Close error modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeErrorModal();
            }
        });
    }

    setupSocketListeners() {
        // Connection events
        this.socket.on('connect', () => {
            console.log('Connected to server');
            this.updateStatus('Connected', 'ready');
        });

        this.socket.on('disconnect', () => {
            console.log('Disconnected from server');
            this.updateStatus('Disconnected', 'error');
        });

        // Conversation events
        this.socket.on('conversation-started', (data) => {
            console.log('Conversation started:', data);
            this.sessionId = data.sessionId;
            this.conversationId = data.callId;
            this.isConversationStarted = true;
            this.updateStatus('Ready to chat', 'ready');
            this.speechStatusDisplay.textContent = 'Click the microphone to speak';
            
            // Store user data for welcome message
            this.userData = data;
            
            // Add welcome message
            this.addMessage(`Welcome! I'm RexBot, your AI receptionist. I understand you're here for: ${data.purpose}. How can I assist you today?`, 'bot');
        });

        this.socket.on('ai-response', (data) => {
            this.hideTypingIndicator();
            this.addMessage(data.response, 'bot');
            
            if (this.isSpeechEnabled) {
                this.speak(data.response);
            }
            
            this.updateStatus('Ready', 'ready');
        });

        this.socket.on('call-accepted', (data) => {
            this.addMessage(`Your call has been accepted by ${data.staffName} from ${data.staffDepartment}. You will be connected shortly.`, 'system');
        });

        this.socket.on('call-completed', (data) => {
            const decision = data.decision === 'accepted' ? 'accepted' : 'declined';
            this.addMessage(`Your meeting request has been ${decision}. ${data.notes ? 'Notes: ' + data.notes : ''}`, 'system');
        });

        // Error handling
        this.socket.on('error', (data) => {
            console.error('Socket error:', data);
            this.showError(data.message || 'An error occurred');
            this.updateStatus('Error', 'error');
        });
        
        // Connection error handling
        this.socket.on('connect_error', (error) => {
            console.error('Connection error:', error);
            this.showError('Failed to connect to server. Please check your internet connection.');
            this.updateStatus('Connection Error', 'error');
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Spacebar to toggle speech input
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
                if (!this.isConversationStarted) {
                    this.startConversation();
                    return;
                }
                
                if (this.speechRecognition) {
                    if (this.isListening) {
                        this.speechRecognition.stop();
                    } else {
                        this.startSpeechRecognition();
                    }
                }
            }
        });
    }

    startConversation() {
        // Show conversation start form
        this.showConversationForm();
    }

    showConversationForm() {
        const formHTML = `
            <div class="conversation-form-overlay">
                <div class="conversation-form">
                    <h2>Start Your Conversation</h2>
                    <p>Please provide your information to begin chatting with RexBot</p>
                    
                    <form id="conversationForm">
                        <div class="form-group">
                            <label for="userName">Your Name</label>
                            <input type="text" id="userName" name="name" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="userEmail">Email Address</label>
                            <input type="email" id="userEmail" name="email" required>
                        </div>
                        
                        <div class="form-group">
                            <label for="purpose">Purpose of Visit</label>
                            <select id="purpose" name="purpose" required>
                                <option value="">Select a purpose</option>
                                <option value="General Inquiry">General Inquiry</option>
                                <option value="Appointment Booking">Appointment Booking</option>
                                <option value="Support Request">Support Request</option>
                                <option value="Sales Inquiry">Sales Inquiry</option>
                                <option value="Feedback">Feedback</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                        
                        <div class="form-actions">
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-play"></i>
                                Start Conversation
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', formHTML);
        
        const form = document.getElementById('conversationForm');
        form.addEventListener('submit', (e) => this.handleConversationSubmit(e));
    }

    handleConversationSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = {
            name: formData.get('name'),
            email: formData.get('email'),
            purpose: formData.get('purpose')
        };
        
        // Validate form data
        if (!data.name || !data.email || !data.purpose) {
            this.showError('Please fill in all fields');
            return;
        }
        
        // Remove the form
        const overlay = document.querySelector('.conversation-form-overlay');
        if (overlay) {
            overlay.remove();
        }
        
        // Update UI
        this.updateStatus('Starting conversation...', 'processing');
        this.speechStatusDisplay.textContent = 'Setting up your conversation...';
        
        // Start conversation with server
        try {
            this.socket.emit('start-conversation', data);
            console.log('Emitting start-conversation with data:', data);
            
            // Set a timeout for conversation start
            setTimeout(() => {
                if (!this.isConversationStarted) {
                    this.showError('Failed to start conversation. Please check your connection and try again.');
                    this.updateStatus('Error', 'error');
                }
            }, 10000); // 10 second timeout
            
        } catch (error) {
            console.error('Error starting conversation:', error);
            this.showError('Failed to start conversation. Please try again.');
            this.updateStatus('Error', 'error');
        }
    }

    startSpeechRecognition() {
        if (this.speechRecognition && this.isConversationStarted) {
            this.speechRecognition.start();
        }
    }

    resetSpeechInput() {
        this.isListening = false;
        this.speechInputButton.classList.remove('recording');
        this.micIcon.className = 'fas fa-microphone';
        this.speechStatusDisplay.textContent = this.isConversationStarted ? 'Click the microphone to speak' : 'Click to start conversation';
        this.speechStatusDisplay.classList.remove('listening');
        this.updateStatus('Ready', 'ready');
    }

    sendMessage(message) {
        if (!message.trim() || !this.isConversationStarted) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Update status
        this.updateStatus('Processing...', 'processing');
        
        // Send message via Socket.IO
        this.socket.emit('chat-message', {
            sessionId: this.sessionId,
            message: message
        });
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.setAttribute('role', 'article');
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        const icon = document.createElement('i');
        if (sender === 'bot') {
            icon.className = 'fas fa-robot';
        } else if (sender === 'user') {
            icon.className = 'fas fa-user';
        } else if (sender === 'system') {
            icon.className = 'fas fa-info-circle';
        }
        avatar.appendChild(icon);
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = text;
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = new Date().toLocaleTimeString();
        
        content.appendChild(messageText);
        content.appendChild(time);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.chatMessages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator() {
        if (this.isTyping) return;
        
        this.isTyping = true;
        const typingDiv = document.createElement('div');
        typingDiv.className = 'message bot-message typing-message';
        typingDiv.setAttribute('role', 'article');
        typingDiv.id = 'typingIndicator';
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        const icon = document.createElement('i');
        icon.className = 'fas fa-robot';
        avatar.appendChild(icon);
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const typingIndicator = document.createElement('div');
        typingIndicator.className = 'typing-indicator';
        typingIndicator.innerHTML = `
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
            <div class="typing-dot"></div>
        `;
        
        content.appendChild(typingIndicator);
        typingDiv.appendChild(avatar);
        typingDiv.appendChild(content);
        
        this.chatMessages.appendChild(typingDiv);
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.isTyping = false;
        const typingIndicator = document.getElementById('typingIndicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }

    toggleSpeech() {
        this.isSpeechEnabled = !this.isSpeechEnabled;
        
        if (this.isSpeechEnabled) {
            this.speechIcon.className = 'fas fa-volume-up';
            this.speechStatus.textContent = 'RexBot voice enabled';
            this.speechToggle.classList.remove('disabled');
        } else {
            this.speechIcon.className = 'fas fa-volume-mute';
            this.speechStatus.textContent = 'RexBot voice disabled';
            this.speechToggle.classList.add('disabled');
        }
    }

    speak(text) {
        if (this.speechSynthesis && this.isSpeechEnabled) {
            // Stop any current speech
            this.speechSynthesis.cancel();
            
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            utterance.volume = 0.8;
            
            // Try to use a more natural voice
            const voices = this.speechSynthesis.getVoices();
            const preferredVoice = voices.find(voice => 
                voice.name.includes('Google') || 
                voice.name.includes('Natural') ||
                voice.name.includes('Premium')
            );
            
            if (preferredVoice) {
                utterance.voice = preferredVoice;
            }
            
            this.speechSynthesis.speak(utterance);
        }
    }

    updateStatus(text, status) {
        if (this.statusText) {
            this.statusText.textContent = text;
        }
        
        if (this.statusDot) {
            this.statusDot.className = `status-dot ${status}`;
        }
    }

    showError(message) {
        if (this.errorModal && this.errorMessage) {
            this.errorMessage.textContent = message;
            this.errorModal.style.display = 'flex';
        } else {
            alert(message);
        }
    }

    closeErrorModal() {
        if (this.errorModal) {
            this.errorModal.style.display = 'none';
        }
    }

    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    setWelcomeTime() {
        const welcomeTime = document.getElementById('welcomeTime');
        if (welcomeTime) {
            welcomeTime.textContent = new Date().toLocaleTimeString();
        }
    }
}

// Initialize RexBot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RexBot();
});
