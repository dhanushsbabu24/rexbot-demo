/**
 * Alexa AI Receptionist Chatbot
 * Frontend JavaScript implementation with speech synthesis
 */

class ReceptionistChatbot {
    constructor() {
        this.conversationId = this.generateConversationId();
        this.speechEnabled = true;
        this.speechSynthesis = window.speechSynthesis;
        this.currentUtterance = null;
        this.isProcessing = false;
        
        this.initializeElements();
        this.setupEventListeners();
        this.initializeSpeech();
        this.setWelcomeTime();
        this.updateStatus('Ready');
    }

    /**
     * Initialize DOM elements
     */
    initializeElements() {
        this.chatForm = document.getElementById('chatForm');
        this.messageInput = document.getElementById('messageInput');
        this.sendButton = document.getElementById('sendButton');
        this.chatMessages = document.getElementById('chatMessages');
        this.speechToggle = document.getElementById('speechToggle');
        this.speechIcon = document.getElementById('speechIcon');
        this.speechStatus = document.getElementById('speechStatus');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.statusDot = document.getElementById('statusDot');
        this.statusText = document.getElementById('statusText');
        this.errorModal = document.getElementById('errorModal');
        this.errorMessage = document.getElementById('errorMessage');
        this.modalClose = document.getElementById('modalClose');
        this.modalOk = document.getElementById('modalOk');
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        // Form submission
        this.chatForm.addEventListener('submit', (e) => this.handleSubmit(e));
        
        // Speech toggle
        this.speechToggle.addEventListener('click', () => this.toggleSpeech());
        
        // Modal controls
        this.modalClose.addEventListener('click', () => this.hideErrorModal());
        this.modalOk.addEventListener('click', () => this.hideErrorModal());
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboard(e));
        
        // Input validation
        this.messageInput.addEventListener('input', () => this.validateInput());
        
        // Click outside modal to close
        this.errorModal.addEventListener('click', (e) => {
            if (e.target === this.errorModal) {
                this.hideErrorModal();
            }
        });
    }

    /**
     * Initialize speech synthesis
     */
    initializeSpeech() {
        if (!this.speechSynthesis) {
            console.warn('Speech synthesis not supported');
            this.speechEnabled = false;
            this.updateSpeechUI();
            return;
        }

        // Wait for voices to load
        this.speechSynthesis.onvoiceschanged = () => {
            this.setupVoice();
        };

        // Handle speech end
        this.speechSynthesis.onend = () => {
            this.currentUtterance = null;
        };

        this.setupVoice();
    }

    /**
     * Set up the voice for speech synthesis
     */
    setupVoice() {
        const voices = this.speechSynthesis.getVoices();
        
        // Try to find a female voice that sounds professional
        let preferredVoice = voices.find(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Alex'))
        );
        
        if (!preferredVoice) {
            preferredVoice = voices.find(voice => voice.lang.startsWith('en')) || voices[0];
        }
        
        if (preferredVoice) {
            console.log('Using voice:', preferredVoice.name);
        }
    }

    /**
     * Handle form submission
     */
    async handleSubmit(e) {
        e.preventDefault();
        
        const message = this.messageInput.value.trim();
        if (!message || this.isProcessing) return;
        
        // Add user message to chat
        this.addMessage(message, 'user');
        this.messageInput.value = '';
        this.validateInput();
        
        // Show loading state
        this.setLoading(true);
        this.updateStatus('Processing...');
        
        try {
            // Send message to API
            const response = await this.sendMessage(message);
            
            // Add bot response to chat
            this.addMessage(response, 'bot');
            
            // Speak the response if speech is enabled
            if (this.speechEnabled) {
                this.speak(response);
            }
            
            this.updateStatus('Ready');
        } catch (error) {
            console.error('Error sending message:', error);
            this.showError('Failed to send message. Please try again.');
            this.updateStatus('Error');
        } finally {
            this.setLoading(false);
        }
    }

    /**
     * Send message to backend API
     */
    async sendMessage(message) {
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
        return data.response;
    }

    /**
     * Add message to chat interface
     */
    addMessage(text, sender) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${sender}-message`;
        messageDiv.setAttribute('role', 'article');
        
        const avatar = document.createElement('div');
        avatar.className = 'message-avatar';
        
        const icon = document.createElement('i');
        icon.className = sender === 'user' ? 'fas fa-user' : 'fas fa-robot';
        avatar.appendChild(icon);
        
        const content = document.createElement('div');
        content.className = 'message-content';
        
        const messageText = document.createElement('div');
        messageText.className = 'message-text';
        messageText.textContent = text;
        
        const time = document.createElement('div');
        time.className = 'message-time';
        time.textContent = this.getCurrentTime();
        
        content.appendChild(messageText);
        content.appendChild(time);
        
        messageDiv.appendChild(avatar);
        messageDiv.appendChild(content);
        
        this.chatMessages.appendChild(messageDiv);
        
        // Scroll to bottom
        this.scrollToBottom();
        
        // Add animation delay for bot messages
        if (sender === 'bot') {
            messageDiv.style.animationDelay = '0.1s';
        }
    }

    /**
     * Speak text using speech synthesis
     */
    speak(text) {
        if (!this.speechSynthesis || !this.speechEnabled) return;
        
        // Stop any current speech
        if (this.currentUtterance) {
            this.speechSynthesis.cancel();
        }
        
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Configure voice settings for Alexa-like experience
        utterance.rate = 0.9; // Slightly slower than default
        utterance.pitch = 1.1; // Slightly higher pitch
        utterance.volume = 0.9; // High volume
        
        // Get available voices
        const voices = this.speechSynthesis.getVoices();
        let preferredVoice = voices.find(voice => 
            voice.lang.startsWith('en') && 
            (voice.name.includes('Female') || voice.name.includes('Samantha') || voice.name.includes('Alex'))
        );
        
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }
        
        // Store current utterance
        this.currentUtterance = utterance;
        
        // Speak the text
        this.speechSynthesis.speak(utterance);
        
        // Update UI to show speaking state
        this.updateSpeechUI(true);
        
        // Reset UI when speech ends
        utterance.onend = () => {
            this.updateSpeechUI(false);
            this.currentUtterance = null;
        };
        
        utterance.onerror = (event) => {
            console.error('Speech synthesis error:', event);
            this.updateSpeechUI(false);
            this.currentUtterance = null;
        };
    }

    /**
     * Toggle speech synthesis on/off
     */
    toggleSpeech() {
        this.speechEnabled = !this.speechEnabled;
        this.updateSpeechUI();
        
        if (!this.speechEnabled && this.currentUtterance) {
            this.speechSynthesis.cancel();
            this.currentUtterance = null;
        }
    }

    /**
     * Update speech UI elements
     */
    updateSpeechUI(isSpeaking = false) {
        if (this.speechEnabled) {
            this.speechIcon.className = isSpeaking ? 'fas fa-volume-mute' : 'fas fa-volume-up';
            this.speechStatus.textContent = isSpeaking ? 'Speaking...' : 'Speech enabled';
            this.speechToggle.classList.toggle('active', isSpeaking);
        } else {
            this.speechIcon.className = 'fas fa-volume-mute';
            this.speechStatus.textContent = 'Speech disabled';
            this.speechToggle.classList.remove('active');
        }
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboard(e) {
        // Ctrl/Cmd + Enter to send message
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.chatForm.dispatchEvent(new Event('submit'));
        }
        
        // Escape to close modal
        if (e.key === 'Escape' && this.errorModal.classList.contains('show')) {
            this.hideErrorModal();
        }
    }

    /**
     * Validate input field
     */
    validateInput() {
        const message = this.messageInput.value.trim();
        const isValid = message.length > 0 && !this.isProcessing;
        
        this.sendButton.disabled = !isValid;
        this.messageInput.setAttribute('aria-invalid', !isValid);
    }

    /**
     * Set loading state
     */
    setLoading(loading) {
        this.isProcessing = loading;
        this.loadingOverlay.classList.toggle('show', loading);
        this.sendButton.disabled = loading;
        this.messageInput.disabled = loading;
        this.validateInput();
    }

    /**
     * Update status indicator
     */
    updateStatus(status) {
        this.statusText.textContent = status;
        
        // Update status dot color
        this.statusDot.className = 'status-dot';
        switch (status.toLowerCase()) {
            case 'ready':
                this.statusDot.style.background = '#10b981';
                break;
            case 'processing...':
                this.statusDot.style.background = '#f59e0b';
                break;
            case 'error':
                this.statusDot.style.background = '#ef4444';
                break;
        }
    }

    /**
     * Show error modal
     */
    showError(message) {
        this.errorMessage.textContent = message;
        this.errorModal.classList.add('show');
        this.errorModal.setAttribute('aria-hidden', 'false');
    }

    /**
     * Hide error modal
     */
    hideErrorModal() {
        this.errorModal.classList.remove('show');
        this.errorModal.setAttribute('aria-hidden', 'true');
    }

    /**
     * Scroll chat to bottom
     */
    scrollToBottom() {
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    /**
     * Get current time formatted
     */
    getCurrentTime() {
        return new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
        });
    }

    /**
     * Set welcome message time
     */
    setWelcomeTime() {
        const welcomeTime = document.getElementById('welcomeTime');
        if (welcomeTime) {
            welcomeTime.textContent = this.getCurrentTime();
        }
    }

    /**
     * Generate unique conversation ID
     */
    generateConversationId() {
        return 'conv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

// Initialize chatbot when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.chatbot = new ReceptionistChatbot();
        console.log('🚀 Alexa AI Receptionist initialized successfully');
    } catch (error) {
        console.error('Failed to initialize chatbot:', error);
        // Show error to user
        setTimeout(() => {
            if (window.chatbot) {
                window.chatbot.showError('Failed to initialize chatbot. Please refresh the page.');
            }
        }, 1000);
    }
});

// Handle page visibility changes to pause speech when tab is hidden
document.addEventListener('visibilitychange', () => {
    if (document.hidden && window.chatbot && window.chatbot.speechSynthesis) {
        window.chatbot.speechSynthesis.pause();
    } else if (!document.hidden && window.chatbot && window.chatbot.speechSynthesis) {
        window.chatbot.speechSynthesis.resume();
    }
});

// Handle beforeunload to clean up speech synthesis
window.addEventListener('beforeunload', () => {
    if (window.chatbot && window.chatbot.speechSynthesis) {
        window.chatbot.speechSynthesis.cancel();
    }
});
