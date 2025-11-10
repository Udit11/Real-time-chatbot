/**
 * Real-Time Chat Widget JavaScript
 * Handles WebSocket communication and UI interactions
 */

class ChatWidget {
    constructor() {
        this.ws = null;
        this.sessionId = this.generateSessionId();
        this.isConnected = false;
        this.isTyping = false;
        this.typingTimeout = null;
        this.currentAvatar = null;
        this.messageQueue = [];
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectDelay = 1000;

        this.init();
    }

    init() {
        this.setupDOMElements();
        this.bindEvents();
        this.connect();
        this.loadChatHistory();
    }

    generateSessionId() {
        return 'session_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
    }

    setupDOMElements() {
        this.elements = {
            widget: document.getElementById('chat-widget'),
            toggle: document.getElementById('chat-toggle'),
            header: document.getElementById('chat-header'),
            messages: document.getElementById('chat-messages'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            voiceBtn: document.getElementById('voice-btn'),
            attachBtn: document.getElementById('attach-btn'),
            fileInput: document.getElementById('file-input'),
            minimizeBtn: document.getElementById('minimize-btn'),
            closeBtn: document.getElementById('close-btn'),
            avatarName: document.getElementById('avatar-name'),
            avatarImage: document.getElementById('avatar-image'),
            presenceStatus: document.getElementById('presence-status'),
            typingIndicator: document.getElementById('typing-indicator-container'),
            typingUser: document.getElementById('typing-user')
        };
    }

    bindEvents() {
        // Message input events
        this.elements.messageInput.addEventListener('input', (e) => this.handleTyping(e));
        this.elements.messageInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });

        // Send button
        this.elements.sendBtn.addEventListener('click', () => this.sendMessage());

        // Voice button
        this.elements.voiceBtn.addEventListener('click', () => this.toggleVoiceRecording());

        // Attach button
        this.elements.attachBtn.addEventListener('click', () => {
            this.elements.fileInput.click();
        });

        // File input
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileUpload(e));

        // Header controls
        this.elements.minimizeBtn.addEventListener('click', () => this.toggleMinimize());
        this.elements.closeBtn.addEventListener('click', () => this.closeChat());

        // Toggle button (when minimized)
        if (this.elements.toggle) {
            this.elements.toggle.addEventListener('click', () => this.openChat());
        }

        // Window events
        window.addEventListener('beforeunload', () => this.disconnect());
        window.addEventListener('online', () => this.connect());
        window.addEventListener('offline', () => this.disconnect());
    }

    connect() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        const wsUrl = `ws://localhost:8000/api/chat/ws/${this.sessionId}`;

        try {
            this.ws = new WebSocket(wsUrl);
            this.setupWebSocketEvents();
            this.showSystemMessage('Connecting...', 'loading');
        } catch (error) {
            console.error('WebSocket connection error:', error);
            this.showSystemMessage('Connection failed. Please refresh the page.', 'error');
        }
    }

    setupWebSocketEvents() {
        this.ws.onopen = () => {
            console.log('WebSocket connected');
            this.isConnected = true;
            this.reconnectAttempts = 0;
            this.clearSystemMessages();
            this.processMessageQueue();
        };

        this.ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                this.handleWebSocketMessage(data);
            } catch (error) {
                console.error('Error parsing WebSocket message:', error);
            }
        };

        this.ws.onclose = (event) => {
            console.log('WebSocket disconnected:', event.code, event.reason);
            this.isConnected = false;
            this.handleDisconnection();
        };

        this.ws.onerror = (error) => {
            console.error('WebSocket error:', error);
            this.showSystemMessage('Connection error. Trying to reconnect...', 'error');
        };
    }

    handleWebSocketMessage(data) {
        switch (data.type) {
            case 'system_message':
                this.showSystemMessage(data.content);
                break;

            case 'message':
                this.showMessage(data);
                break;

            case 'typing_indicator':
                this.handleTypingIndicator(data);
                break;

            case 'presence_update':
                this.handlePresenceUpdate(data);
                break;

            case 'conversation_ended':
                this.showSystemMessage(data.content);
                this.disableInput();
                break;

            case 'error':
                this.showSystemMessage(data.content, 'error');
                break;

            default:
                console.log('Unknown message type:', data.type, data);
        }
    }

    handleDisconnection() {
        if (this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnectAttempts++;
            const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

            this.showSystemMessage(`Connection lost. Reconnecting... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`, 'loading');

            setTimeout(() => {
                this.connect();
            }, delay);
        } else {
            this.showSystemMessage('Unable to connect. Please refresh the page.', 'error');
            this.disableInput();
        }
    }

    sendMessage() {
        const content = this.elements.messageInput.value.trim();
        if (!content || !this.isConnected) {
            return;
        }

        const message = {
            type: 'text',
            content: content,
            timestamp: new Date().toISOString()
        };

        this.sendToWebSocket(message);
        this.elements.messageInput.value = '';
        this.stopTyping();
    }

    sendToWebSocket(message) {
        if (this.isConnected && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        } else {
            this.messageQueue.push(message);
        }
    }

    processMessageQueue() {
        while (this.messageQueue.length > 0 && this.isConnected) {
            const message = this.messageQueue.shift();
            this.sendToWebSocket(message);
        }
    }

    handleTyping(event) {
        const hasContent = this.elements.messageInput.value.trim().length > 0;

        if (hasContent && !this.isTyping) {
            this.isTyping = true;
            this.sendToWebSocket({ type: 'typing_start' });
        } else if (!hasContent && this.isTyping) {
            this.stopTyping();
        }

        // Reset typing timeout
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            this.stopTyping();
        }, 1000);
    }

    stopTyping() {
        if (this.isTyping) {
            this.isTyping = false;
            this.sendToWebSocket({ type: 'typing_stop' });
        }
        clearTimeout(this.typingTimeout);
    }

    handleTypingIndicator(data) {
        if (data.is_typing) {
            this.showTypingIndicator(data.sender || 'Someone');
        } else {
            this.hideTypingIndicator();
        }
    }

    handlePresenceUpdate(data) {
        const statusElement = this.elements.presenceStatus;
        const statusIndicator = statusElement.querySelector('.status-indicator');

        statusElement.className = 'presence-status';
        statusIndicator.className = 'status-indicator';

        switch (data.status) {
            case 'online':
                statusIndicator.classList.add('online');
                statusElement.innerHTML = '<span class="status-indicator online"></span> Online';
                break;
            case 'away':
                statusIndicator.classList.add('away');
                statusElement.innerHTML = '<span class="status-indicator away"></span> Away';
                break;
            case 'offline':
                statusIndicator.classList.add('offline');
                statusElement.innerHTML = '<span class="status-indicator offline"></span> Offline';
                break;
        }
    }

    showMessage(data) {
        if (data.sender === 'avatar' && data.avatar_config) {
            this.updateAvatar(data.avatar_config);
        }

        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${data.sender}`;
        messageDiv.innerHTML = `
            <div class="message-content">${this.escapeHtml(data.content)}</div>
            <div class="message-timestamp">${this.formatTimestamp(data.timestamp)}</div>
        `;

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showSystemMessage(content, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `system-message ${type}`;
        messageDiv.textContent = content;

        this.elements.messages.appendChild(messageDiv);
        this.scrollToBottom();
    }

    showTypingIndicator(user) {
        this.elements.typingUser.textContent = user;
        this.elements.typingIndicator.classList.remove('hidden');
        this.scrollToBottom();
    }

    hideTypingIndicator() {
        this.elements.typingIndicator.classList.add('hidden');
    }

    clearSystemMessages() {
        const systemMessages = this.elements.messages.querySelectorAll('.system-message');
        systemMessages.forEach(msg => msg.remove());
    }

    updateAvatar(avatarConfig) {
        if (avatarConfig.name) {
            this.elements.avatarName.textContent = avatarConfig.name;
        }

        // Update avatar appearance based on visual_appearance config
        if (avatarConfig.visual_appearance) {
            const { visual_appearance } = avatarConfig;
            if (visual_appearance.branding_elements && visual_appearance.branding_elements.logo_url) {
                this.elements.avatarImage.innerHTML = `<img src="${visual_appearance.branding_elements.logo_url}" alt="Avatar" style="width: 100%; height: 100%; object-fit: cover;">`;
            }
        }
    }

    toggleVoiceRecording() {
        if (!this.isRecording) {
            this.startVoiceRecording();
        } else {
            this.stopVoiceRecording();
        }
    }

    startVoiceRecording() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            this.showSystemMessage('Voice recording is not supported in your browser', 'error');
            return;
        }

        navigator.mediaDevices.getUserMedia({ audio: true })
            .then(stream => {
                this.mediaRecorder = new MediaRecorder(stream);
                this.audioChunks = [];
                this.isRecording = true;

                this.elements.voiceBtn.classList.add('recording');
                this.elements.voiceBtn.innerHTML = '⏹️';

                this.mediaRecorder.ondataavailable = event => {
                    this.audioChunks.push(event.data);
                };

                this.mediaRecorder.onstop = () => {
                    const audioBlob = new Blob(this.audioChunks, { type: 'audio/wav' });
                    this.handleVoiceRecording(audioBlob);
                };

                this.mediaRecorder.start();
                this.showSystemMessage('Recording... Click again to stop');
            })
            .catch(error => {
                console.error('Error accessing microphone:', error);
                this.showSystemMessage('Unable to access microphone', 'error');
            });
    }

    stopVoiceRecording() {
        if (this.mediaRecorder && this.isRecording) {
            this.mediaRecorder.stop();
            this.mediaRecorder.stream.getTracks().forEach(track => track.stop());
            this.isRecording = false;
            this.elements.voiceBtn.classList.remove('recording');
            this.elements.voiceBtn.innerHTML = '🎤';
            this.clearSystemMessages();
        }
    }

    handleVoiceRecording(audioBlob) {
        // Convert audio to base64 and send
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64Audio = reader.result;
            const message = {
                type: 'voice',
                content: base64Audio,
                timestamp: new Date().toISOString()
            };
            this.sendToWebSocket(message);
        };
        reader.readAsDataURL(audioBlob);
    }

    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;

        // Check file size (max 10MB)
        if (file.size > 10 * 1024 * 1024) {
            this.showSystemMessage('File size must be less than 10MB', 'error');
            return;
        }

        this.showUploadProgress(file.name);

        const reader = new FileReader();
        reader.onloadend = () => {
            const base64File = reader.result;
            const message = {
                type: 'media_upload',
                content: base64File,
                filename: file.name,
                mimetype: file.type,
                timestamp: new Date().toISOString()
            };
            this.sendToWebSocket(message);
            this.hideUploadProgress();
        };
        reader.readAsDataURL(file);

        // Clear file input
        event.target.value = '';
    }

    showUploadProgress(filename) {
        const progressDiv = document.createElement('div');
        progressDiv.className = 'upload-progress';
        progressDiv.innerHTML = `
            <div class="upload-filename">${filename}</div>
            <div class="upload-progress-bar">
                <div class="upload-progress-fill" style="width: 0%"></div>
            </div>
        `;
        this.elements.messages.appendChild(progressDiv);
        this.uploadProgressElement = progressDiv;
    }

    hideUploadProgress() {
        if (this.uploadProgressElement) {
            this.uploadProgressElement.remove();
            this.uploadProgressElement = null;
        }
    }

    toggleMinimize() {
        this.elements.widget.classList.toggle('minimized');
        this.elements.messages.classList.toggle('hidden');
        this.elements.messageInput.parentElement.classList.toggle('hidden');
    }

    closeChat() {
        this.elements.widget.classList.add('hidden');
        if (this.elements.toggle) {
            this.elements.toggle.classList.remove('hidden');
        }
        this.disconnect();
    }

    openChat() {
        this.elements.widget.classList.remove('hidden');
        if (this.elements.toggle) {
            this.elements.toggle.classList.add('hidden');
        }
        if (!this.isConnected) {
            this.connect();
        }
        this.elements.messageInput.focus();
    }

    disableInput() {
        this.elements.messageInput.disabled = true;
        this.elements.sendBtn.disabled = true;
        this.elements.voiceBtn.disabled = true;
        this.elements.attachBtn.disabled = true;
    }

    enableInput() {
        this.elements.messageInput.disabled = false;
        this.elements.sendBtn.disabled = false;
        this.elements.voiceBtn.disabled = false;
        this.elements.attachBtn.disabled = false;
    }

    loadChatHistory() {
        // Load chat history from localStorage
        const history = localStorage.getItem(`chat_history_${this.sessionId}`);
        if (history) {
            try {
                const messages = JSON.parse(history);
                messages.forEach(msg => this.showMessage(msg));
            } catch (error) {
                console.error('Error loading chat history:', error);
            }
        }
    }

    saveChatHistory() {
        const messages = [];
        const messageElements = this.elements.messages.querySelectorAll('.message');
        messageElements.forEach(element => {
            const content = element.querySelector('.message-content').textContent;
            const timestamp = element.querySelector('.message-timestamp').textContent;
            const sender = element.classList.contains('user') ? 'user' : 'avatar';
            messages.push({ sender, content, timestamp });
        });

        localStorage.setItem(`chat_history_${this.sessionId}`, JSON.stringify(messages));
    }

    scrollToBottom() {
        this.elements.messages.scrollTop = this.elements.messages.scrollHeight;
    }

    formatTimestamp(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.isConnected = false;
        this.saveChatHistory();
    }
}

// Initialize the chat widget when the page loads
document.addEventListener('DOMContentLoaded', () => {
    window.chatWidget = new ChatWidget();
});

// Make it available globally for debugging
window.ChatWidget = ChatWidget;