/**
 * StrichBot Admin Interface - Compact Version
 * Essential functionality only with reliable API calls and auto-refresh
 */

class StrichBotAdmin {
    constructor() {
        this.authToken = null;
        this.refreshInterval = null;
        this.lastUpdateTime = null;

        this.initializeEventListeners();
        this.checkStoredAuth();
    }

    initializeEventListeners() {
        // Authentication
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Essential Controls
        document.getElementById('save-schedule').addEventListener('click', () => {
            this.saveSchedule();
        });

        document.getElementById('save-api-config').addEventListener('click', () => {
            this.saveApiConfig();
        });

        // Testing Tools
        document.getElementById('test-telegram').addEventListener('click', () => {
            this.testTelegram();
        });

        document.getElementById('test-nostr').addEventListener('click', () => {
            this.testNostr();
        });

        document.getElementById('test-api-key').addEventListener('click', () => {
            this.testApiKey();
        });

        // Data Export
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportData();
        });
    }

    checkStoredAuth() {
        const storedToken = localStorage.getItem('adminToken');
        if (storedToken) {
            this.authToken = storedToken;
            this.showDashboard();
        }
    }

    async login() {
        const token = document.getElementById('admin-token').value.trim();
        if (!token) {
            this.showMessage('Please enter admin token', 'error');
            return;
        }

        try {
            // Test the token by making a simple API call
            const response = await this.apiCall('/api/admin/stats', 'GET', null, token);

            if (response.success) {
                this.authToken = token;
                localStorage.setItem('adminToken', token);
                this.showDashboard();
                this.showMessage('Login successful!', 'success');
            } else {
                throw new Error(response.error || 'Authentication failed');
            }
        } catch (error) {
            this.showMessage(`Login failed: ${error.message}`, 'error');
        }
    }

    logout() {
        this.authToken = null;
        localStorage.removeItem('adminToken');
        this.stopAutoRefresh();

        document.getElementById('auth-section').style.display = 'block';
        document.getElementById('dashboard').classList.remove('active');
        document.getElementById('admin-token').value = '';

        this.showMessage('Logged out successfully', 'success');
    }

    showDashboard() {
        document.getElementById('auth-section').style.display = 'none';
        document.getElementById('dashboard').classList.add('active');

        // Load initial data
        this.loadAllData();
        this.startAutoRefresh();
    }

    startAutoRefresh() {
        // Refresh every 30 seconds
        this.refreshInterval = setInterval(() => {
            this.loadSystemStatus();
        }, 30000);
    }

    stopAutoRefresh() {
        if (this.refreshInterval) {
            clearInterval(this.refreshInterval);
            this.refreshInterval = null;
        }
    }

    async loadAllData() {
        try {
            await Promise.allSettled([
                this.loadSystemStatus(),
                this.loadConfiguration()
            ]);
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async loadSystemStatus() {
        try {
            // Load system status with timeout
            const [versionResponse, statsResponse, apiKeyResponse] = await Promise.allSettled([
                this.apiCallWithTimeout('/api/version', 'GET', null, 5000),
                this.apiCallWithTimeout('/api/admin/stats', 'GET', null, 5000),
                this.apiCallWithTimeout('/api/check-api-key', 'GET', null, 5000)
            ]);

            // Update version
            if (versionResponse.status === 'fulfilled' && versionResponse.value.success) {
                const version = versionResponse.value.data?.version || versionResponse.value.version || '1.0.0';
                this.updateStatus('bot-version', version);
            } else {
                this.updateStatus('bot-version', 'Unknown');
            }

            // Update stats
            if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
                const data = statsResponse.value.data;
                this.updateStatus('data-points', data?.totalPoints || 'N/A');
                this.updateStatus('last-daily-post', data?.lastPost || 'Never');
            } else {
                this.updateStatus('data-points', 'N/A');
                this.updateStatus('last-daily-post', 'N/A');
            }

            // Update API key status
            if (apiKeyResponse.status === 'fulfilled' && apiKeyResponse.value.success) {
                const apiData = apiKeyResponse.value.data;
                const status = apiData?.expiration?.expired ? '🔴 Expired' :
                             apiData?.expiration?.daysUntilExpiry < 7 ? '🟡 Expiring Soon' : '🟢 Valid';
                this.updateStatus('api-key-status', status);
            } else {
                this.updateStatus('api-key-status', '🟡 Unknown');
            }

            // Update last refresh time
            this.lastUpdateTime = new Date();
            document.getElementById('last-updated').textContent =
                `Last updated: ${this.lastUpdateTime.toLocaleTimeString()}`;

        } catch (error) {
            console.error('Error loading system status:', error);
            this.updateStatus('api-key-status', 'Error');
            this.updateStatus('data-points', 'Error');
            this.updateStatus('last-daily-post', 'Error');
            this.updateStatus('bot-version', 'Error');
        }
    }

    async loadConfiguration() {
        try {
            const response = await this.apiCall('/api/admin/schedule', 'GET');
            if (response.success && response.data) {
                this.populateConfig(response.data);
            }
        } catch (error) {
            console.error('Error loading configuration:', error);
        }
    }

    populateConfig(config) {
        // Update daily posts toggle
        if (config.categories) {
            document.getElementById('daily-enabled').checked = config.categories.daily || false;
        }

        // Update API key expiry if available
        if (config.environment?.apiKeyExpiry) {
            const expiryDate = new Date(config.environment.apiKeyExpiry);
            const localDateTime = expiryDate.toISOString().slice(0, 16);
            document.getElementById('api-expiry-date').value = localDateTime;
        }
    }

    updateStatus(elementId, value) {
        const element = document.getElementById(elementId);
        if (element) {
            element.textContent = value;
        }
    }

    async saveSchedule() {
        try {
            const config = {
                categories: {
                    daily: document.getElementById('daily-enabled').checked,
                    weekly: false,
                    monthly: false,
                    annual: false
                }
            };

            const response = await this.apiCall('/api/admin/schedule', 'POST', config);

            if (response.success) {
                this.showMessage('Schedule settings saved successfully!', 'success');
            } else {
                throw new Error(response.error || 'Failed to save schedule');
            }
        } catch (error) {
            this.showMessage(`Failed to save schedule: ${error.message}`, 'error');
        }
    }

    async saveApiConfig() {
        try {
            const expiryDate = document.getElementById('api-expiry-date').value;
            if (!expiryDate) {
                this.showMessage('Please select an expiry date', 'error');
                return;
            }

            const config = {
                expiryDate: new Date(expiryDate).toISOString(),
                warningDays: '7,3,1'
            };

            const response = await this.apiCall('/api/admin/config', 'POST', { apiKey: config });

            if (response.success) {
                this.showMessage('API key configuration saved successfully!', 'success');
                // Refresh status to show updated API key info
                setTimeout(() => this.loadSystemStatus(), 1000);
            } else {
                throw new Error(response.error || 'Failed to save API configuration');
            }
        } catch (error) {
            this.showMessage(`Failed to save API configuration: ${error.message}`, 'error');
        }
    }

    async testTelegram() {
        try {
            this.showMessage('Sending test Telegram message...', 'info');

            const response = await this.apiCall('/api/admin/test-notification', 'POST', {
                type: 'telegram'
            });

            if (response.success) {
                this.showMessage('✅ Telegram test successful! Message sent.', 'success');
            } else {
                throw new Error(response.error || response.details || 'Telegram test failed');
            }
        } catch (error) {
            this.showMessage(`❌ Telegram test failed: ${error.message}`, 'error');
        }
    }

    async testNostr() {
        try {
            this.showMessage('Sending test Nostr post...', 'info');

            const useTestProfile = document.getElementById('use-test-nostr').checked;
            const response = await this.apiCall('/api/admin/test-notification', 'POST', {
                type: 'nostr',
                useTestProfile: useTestProfile
            });

            if (response.success) {
                const profile = useTestProfile ? 'test profile' : 'main profile';
                this.showMessage(`✅ Nostr test successful! Posted with ${profile}.`, 'success');
            } else {
                throw new Error(response.error || response.details || 'Nostr test failed');
            }
        } catch (error) {
            this.showMessage(`❌ Nostr test failed: ${error.message}`, 'error');
        }
    }

    async testApiKey() {
        try {
            this.showMessage('Testing API connectivity...', 'info');

            const response = await this.apiCall('/api/admin/test-notification', 'POST', {
                type: 'api-test'
            });

            if (response.success) {
                this.showMessage('✅ API connectivity test successful!', 'success');
            } else {
                throw new Error(response.error || 'API test failed');
            }
        } catch (error) {
            this.showMessage(`❌ API test failed: ${error.message}`, 'error');
        }
    }

    async exportData() {
        try {
            const startDate = document.getElementById('export-start').value;
            const endDate = document.getElementById('export-end').value;

            if (!startDate || !endDate) {
                this.showMessage('Please select both start and end dates', 'error');
                return;
            }

            this.showMessage('Exporting data...', 'info');

            const response = await this.apiCall('/api/admin/stats', 'POST', {
                action: 'export',
                startDate: startDate,
                endDate: endDate
            });

            if (response.success && response.data?.csv) {
                // Create and download CSV file
                const blob = new Blob([response.data.csv], { type: 'text/csv' });
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.style.display = 'none';
                a.href = url;
                a.download = response.data.filename || 'strichbot-data.csv';
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                this.showMessage('✅ Data exported successfully!', 'success');
            } else {
                throw new Error(response.error || 'Export failed');
            }
        } catch (error) {
            this.showMessage(`❌ Export failed: ${error.message}`, 'error');
        }
    }

    async apiCall(endpoint, method = 'GET', data = null, customToken = null) {
        const token = customToken || this.authToken;

        const options = {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'X-API-Key': token })
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(endpoint, options);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    async apiCallWithTimeout(endpoint, method = 'GET', data = null, timeout = 5000) {
        return Promise.race([
            this.apiCall(endpoint, method, data),
            new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Request timeout')), timeout)
            )
        ]);
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('status-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        messageDiv.textContent = message;

        container.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);

        // Remove old messages if too many
        const messages = container.querySelectorAll('.message');
        if (messages.length > 5) {
            messages[0].remove();
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.strichBotAdmin = new StrichBotAdmin();
});