/**
 * Enhanced RexBot AI Character - Main Script
 */

class RexBot {
    constructor() {
        this.conversationId = this.generateConversationId();
        this.speechRecognition = null;
        this.speechSynthesis = window.speechSynthesis;
        this.isListening = false;
        this.isSpeechEnabled = true;
        this.isTyping = false;
        
        this.initializeElements();
        this.initializeSpeechRecognition();
        this.setupEventListeners();
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

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Spacebar to toggle speech input
            if (e.code === 'Space' && !e.target.matches('input, textarea')) {
                e.preventDefault();
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

    startSpeechRecognition() {
        if (this.speechRecognition) {
            this.speechRecognition.start();
        }
    }

    resetSpeechInput() {
        this.isListening = false;
        this.speechInputButton.classList.remove('recording');
        this.micIcon.className = 'fas fa-microphone';
        this.speechStatusDisplay.textContent = 'Click the microphone to speak';
        this.speechStatusDisplay.classList.remove('listening');
        this.updateStatus('Ready', 'ready');
    }

    async sendMessage(message) {
        if (!message.trim()) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        
        // Show typing indicator
        this.showTypingIndicator();
        
        // Update status
        this.updateStatus('Processing...', 'processing');
        
        try {
            const response = await fetch('/api/chat', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message: message,
                    conversationId: this.conversationId
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Hide typing indicator
            this.hideTypingIndicator();
            
            // Add bot response to chat
            this.addMessage(data.response, 'bot');
            
            // Speak the response if enabled
            if (this.isSpeechEnabled) {
                this.speak(data.response);
            }
            
            this.updateStatus('Ready', 'ready');
            
        } catch (error) {
            console.error('Error sending message:', error);
            this.hideTypingIndicator();
            this.showError('Failed to send message. Please try again.');
            this.updateStatus('Error', 'error');
        }
    }

    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.setAttribute('role', 'article');
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        const icon = document.createElement('i');
        icon.className = sender === 'bot' ? 'fas fa-robot' : 'fas fa-user';
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

    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize RexBot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new RexBot();
});
