// Staff Dashboard JavaScript
class StaffDashboard {
    constructor() {
        this.socket = io();
        this.currentUser = null;
        this.currentCall = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        this.isMuted = false;
        this.isVideoOff = false;
        
        this.initializeElements();
        this.bindEvents();
        this.setupSocketListeners();
    }

    initializeElements() {
        // Login elements
        this.loginSection = document.getElementById('loginSection');
        this.dashboardSection = document.getElementById('dashboardSection');
        this.loginForm = document.getElementById('loginForm');
        this.loginError = document.getElementById('loginError');
        
        // Dashboard elements
        this.staffInfo = document.getElementById('staffInfo');
        this.logoutBtn = document.getElementById('logoutBtn');
        this.waitingCount = document.getElementById('waitingCount');
        this.callQueue = document.getElementById('callQueue');
        this.callHistory = document.getElementById('callHistory');
        
        // Video elements
        this.videoContainer = document.getElementById('videoContainer');
        this.localVideo = document.getElementById('localVideo');
        this.remoteVideo = document.getElementById('remoteVideo');
        this.callControls = document.getElementById('callControls');
        this.callDecision = document.getElementById('callDecision');
        
        // Control buttons
        this.muteBtn = document.getElementById('muteBtn');
        this.videoBtn = document.getElementById('videoBtn');
        this.endCallBtn = document.getElementById('endCallBtn');
        this.acceptBtn = document.getElementById('acceptBtn');
        this.rejectBtn = document.getElementById('rejectBtn');
        this.callNotes = document.getElementById('callNotes');
    }

    bindEvents() {
        // Login form
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        
        // Logout
        this.logoutBtn.addEventListener('click', () => this.handleLogout());
        
        // Call controls
        this.muteBtn.addEventListener('click', () => this.toggleMute());
        this.videoBtn.addEventListener('click', () => this.toggleVideo());
        this.endCallBtn.addEventListener('click', () => this.endCall());
        
        // Decision buttons
        this.acceptBtn.addEventListener('click', () => this.makeDecision('accepted'));
        this.rejectBtn.addEventListener('click', () => this.makeDecision('rejected'));
    }

    setupSocketListeners() {
        // Login responses
        this.socket.on('login-success', (data) => this.handleLoginSuccess(data));
        this.socket.on('login-error', (data) => this.handleLoginError(data));
        
        // Call management
        this.socket.on('new-call-request', (data) => this.handleNewCall(data));
        this.socket.on('call-started', (data) => this.handleCallStarted(data));
        this.socket.on('call-completed', (data) => this.handleCallCompleted(data));
        
        // Video call signaling
        this.socket.on('offer', (data) => this.handleOffer(data));
        this.socket.on('answer', (data) => this.handleAnswer(data));
        this.socket.on('ice-candidate', (data) => this.handleIceCandidate(data));
        
        // Decision responses
        this.socket.on('decision-saved', (data) => this.handleDecisionSaved(data));
        
        // Error handling
        this.socket.on('error', (data) => this.showNotification(data.message, 'error'));
    }

    async handleLogin(e) {
        e.preventDefault();
        const formData = new FormData(this.loginForm);
        const email = formData.get('email');
        const password = formData.get('password');

        this.socket.emit('staff-login', { email, password });
    }

    handleLoginSuccess(data) {
        this.currentUser = data.user;
        this.loginSection.style.display = 'none';
        this.dashboardSection.style.display = 'block';
        this.staffInfo.textContent = `${data.user.name} - ${data.user.department}`;
        
        this.showNotification('Login successful!', 'success');
        this.loadCallHistory();
    }

    handleLoginError(data) {
        this.loginError.textContent = data.message;
        this.loginError.style.display = 'block';
    }

    handleLogout() {
        this.currentUser = null;
        this.dashboardSection.style.display = 'none';
        this.loginSection.style.display = 'flex';
        this.loginForm.reset();
        this.loginError.style.display = 'none';
        
        if (this.currentCall) {
            this.endCall();
        }
    }

    handleNewCall(data) {
        this.showNotification(`New call from ${data.clientName}`, 'success');
        this.addCallToQueue(data);
        this.updateWaitingCount();
    }

    addCallToQueue(callData) {
        const callItem = document.createElement('div');
        callItem.className = 'call-item';
        callItem.innerHTML = `
            <h3>${callData.clientName}</h3>
            <p>${callData.purpose}</p>
            <div class="time">${new Date(callData.timestamp).toLocaleTimeString()}</div>
            <button class="accept-call-btn" onclick="staffDashboard.acceptCall('${callData.callId}')">
                Accept Call
            </button>
        `;
        
        this.callQueue.appendChild(callItem);
    }

    async acceptCall(callId) {
        try {
            this.socket.emit('accept-call', { callId });
            this.currentCall = { id: callId };
            
            // Initialize video call
            await this.initializeVideoCall();
            
            this.showNotification('Call accepted!', 'success');
        } catch (error) {
            this.showNotification('Failed to accept call', 'error');
        }
    }

    async initializeVideoCall() {
        try {
            // Get user media
            this.localStream = await navigator.mediaDevices.getUserMedia({
                video: true,
                audio: true
            });
            
            this.localVideo.srcObject = this.localStream;
            this.localVideo.style.display = 'block';
            
            // Setup peer connection
            this.peerConnection = new RTCPeerConnection({
                iceServers: [
                    { urls: 'stun:stun.l.google.com:19302' }
                ]
            });
            
            // Add local stream
            this.localStream.getTracks().forEach(track => {
                this.peerConnection.addTrack(track, this.localStream);
            });
            
            // Handle remote stream
            this.peerConnection.ontrack = (event) => {
                this.remoteStream = event.streams[0];
                this.remoteVideo.srcObject = this.remoteStream;
                this.remoteVideo.style.display = 'block';
            };
            
            // Handle ICE candidates
            this.peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.socket.emit('ice-candidate', {
                        target: this.currentCall.clientSocketId,
                        candidate: event.candidate
                    });
                }
            };
            
            // Show call controls
            this.callControls.style.display = 'flex';
            this.callDecision.style.display = 'block';
            
        } catch (error) {
            console.error('Error initializing video call:', error);
            this.showNotification('Failed to initialize video call', 'error');
        }
    }

    handleCallStarted(data) {
        this.currentCall = data;
        this.showNotification('Call started!', 'success');
    }

    handleOffer(data) {
        if (this.peerConnection) {
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.offer))
                .then(() => this.peerConnection.createAnswer())
                .then(answer => this.peerConnection.setLocalDescription(answer))
                .then(() => {
                    this.socket.emit('answer', {
                        target: data.from,
                        answer: this.peerConnection.localDescription
                    });
                });
        }
    }

    handleAnswer(data) {
        if (this.peerConnection) {
            this.peerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
    }

    handleIceCandidate(data) {
        if (this.peerConnection) {
            this.peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
    }

    toggleMute() {
        if (this.localStream) {
            const audioTrack = this.localStream.getAudioTracks()[0];
            if (audioTrack) {
                audioTrack.enabled = !audioTrack.enabled;
                this.isMuted = !audioTrack.enabled;
                this.muteBtn.innerHTML = this.isMuted ? '<i class="fas fa-microphone-slash"></i>' : '<i class="fas fa-microphone"></i>';
            }
        }
    }

    toggleVideo() {
        if (this.localStream) {
            const videoTrack = this.localStream.getVideoTracks()[0];
            if (videoTrack) {
                videoTrack.enabled = !videoTrack.enabled;
                this.isVideoOff = !videoTrack.enabled;
                this.videoBtn.innerHTML = this.isVideoOff ? '<i class="fas fa-video-slash"></i>' : '<i class="fas fa-video"></i>';
            }
        }
    }

    endCall() {
        if (this.currentCall) {
            this.socket.emit('end-call', { callId: this.currentCall.id });
            this.cleanupCall();
        }
    }

    cleanupCall() {
        // Stop all tracks
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => track.stop());
        }
        
        // Close peer connection
        if (this.peerConnection) {
            this.peerConnection.close();
        }
        
        // Reset video elements
        this.localVideo.style.display = 'none';
        this.remoteVideo.style.display = 'none';
        this.callControls.style.display = 'none';
        this.callDecision.style.display = 'none';
        
        // Clear current call
        this.currentCall = null;
        this.peerConnection = null;
        this.localStream = null;
        this.remoteStream = null;
        
        // Show placeholder
        this.videoContainer.innerHTML = `
            <div class="video-placeholder">
                <i class="fas fa-video"></i>
                <h3>No Active Call</h3>
                <p>Accept a call from the queue to start video communication</p>
            </div>
        `;
    }

    makeDecision(decision) {
        if (!this.currentCall) return;
        
        const notes = this.callNotes.value;
        this.socket.emit('call-decision', {
            callId: this.currentCall.id,
            decision,
            notes
        });
        
        this.showNotification(`Decision: ${decision}`, 'success');
        this.cleanupCall();
    }

    handleDecisionSaved(data) {
        this.showNotification(`Call decision saved: ${data.decision}`, 'success');
        this.loadCallHistory();
    }

    handleCallCompleted(data) {
        this.showNotification(`Call completed. Decision: ${data.decision}`, 'success');
        this.cleanupCall();
    }

    async loadCallHistory() {
        try {
            const response = await fetch('/api/calls/my-calls', {
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            
            if (response.ok) {
                const calls = await response.json();
                this.displayCallHistory(calls);
            }
        } catch (error) {
            console.error('Error loading call history:', error);
        }
    }

    displayCallHistory(calls) {
        this.callHistory.innerHTML = '';
        
        if (calls.length === 0) {
            this.callHistory.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clock"></i>
                    <p>No call history</p>
                </div>
            `;
            return;
        }
        
        calls.forEach(call => {
            const historyItem = document.createElement('div');
            historyItem.className = `history-item ${call.decision === 'rejected' ? 'rejected' : ''}`;
            historyItem.innerHTML = `
                <h3>${call.clientId.name}</h3>
                <p>${call.purpose}</p>
                <div class="meta">
                    <span>${new Date(call.createdAt).toLocaleDateString()}</span>
                    <span class="decision-badge ${call.decision}">${call.decision}</span>
                </div>
            `;
            this.callHistory.appendChild(historyItem);
        });
    }

    updateWaitingCount() {
        const count = this.callQueue.children.length;
        this.waitingCount.textContent = count;
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        const container = document.getElementById('notificationContainer');
        container.appendChild(notification);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
}

// Initialize the dashboard when the page loads
let staffDashboard;
document.addEventListener('DOMContentLoaded', () => {
    staffDashboard = new StaffDashboard();
});
