/**
 * StrichBot Admin Dashboard JavaScript
 * Handles authentication, configuration, and testing
 */

class AdminDashboard {
    constructor() {
        this.token = null;
        this.baseUrl = window.location.origin;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
    }

    setupEventListeners() {
        // Authentication
        document.getElementById('auth-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.authenticate();
        });

        document.getElementById('logout-btn').addEventListener('click', () => {
            this.logout();
        });

        // Schedule management
        document.getElementById('save-schedule').addEventListener('click', () => {
            this.saveSchedule();
        });

        document.getElementById('preview-schedule').addEventListener('click', () => {
            this.previewSchedule();
        });

        // API key management
        document.getElementById('save-api-config').addEventListener('click', () => {
            this.saveApiConfig();
        });

        document.getElementById('test-api-key').addEventListener('click', () => {
            this.testApiKey();
        });

        // Data management
        document.getElementById('export-csv').addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('cleanup-data').addEventListener('click', () => {
            this.cleanupData();
        });

        // Testing tools
        document.getElementById('test-telegram').addEventListener('click', () => {
            this.testTelegram();
        });

        document.getElementById('test-nostr').addEventListener('click', () => {
            this.testNostr();
        });

        document.getElementById('generate-weekly').addEventListener('click', () => {
            this.generateReport('weekly');
        });

        document.getElementById('generate-monthly').addEventListener('click', () => {
            this.generateReport('monthly');
        });

        document.getElementById('check-apis').addEventListener('click', () => {
            this.checkApis();
        });

        document.getElementById('view-logs').addEventListener('click', () => {
            this.viewLogs();
        });
    }

    checkAuth() {
        const savedToken = localStorage.getItem('strichbot-admin-token');
        if (savedToken) {
            this.token = savedToken;
            this.showDashboard();
            this.loadDashboardData();
        }
    }

    async authenticate() {
        const token = document.getElementById('admin-token').value;

        try {
            const response = await this.apiCall('/api/admin/config', 'GET', null, token);

            if (response.success) {
                this.token = token;
                localStorage.setItem('strichbot-admin-token', token);
                this.showMessage('Authentication successful! Welcome to StrichBot Admin.', 'success');
                this.showDashboard();
                this.loadDashboardData();
            } else {
                throw new Error(response.error || 'Authentication failed');
            }
        } catch (error) {
            this.showMessage(`Authentication failed: ${error.message}`, 'error');
        }
    }

    showDashboard() {
        document.getElementById('auth-section').classList.add('hidden');
        document.getElementById('dashboard').classList.remove('hidden');
        document.getElementById('logout-btn').classList.remove('hidden');
    }

    logout() {
        this.token = null;
        localStorage.removeItem('strichbot-admin-token');
        document.getElementById('auth-section').classList.remove('hidden');
        document.getElementById('dashboard').classList.add('hidden');
        document.getElementById('logout-btn').classList.add('hidden');
        document.getElementById('admin-token').value = '';
        this.showMessage('Logged out successfully', 'success');
    }

    async loadDashboardData() {
        try {
            // Load current configuration
            const config = await this.apiCall('/api/admin/config', 'GET');
            this.populateConfig(config.data);

            // Load system status
            await this.loadSystemStatus();

        } catch (error) {
            this.showMessage(`Failed to load dashboard data: ${error.message}`, 'error');
        }
    }

    async loadSystemStatus() {
        try {
            // Check API key status
            const apiKeyStatus = await this.apiCall('/api/check-api-key', 'GET');
            this.updateStatus('api-key-status',
                apiKeyStatus.data?.expiration?.expired ? '🔴 Expired' :
                apiKeyStatus.data?.expiration?.daysUntilExpiry < 7 ? '🟡 Expiring Soon' : '🟢 Valid'
            );

            // Get version info
            const versionInfo = await this.apiCall('/api/version', 'GET');
            this.updateStatus('bot-version', versionInfo.version || '1.0.0');

            // Load data stats
            const stats = await this.apiCall('/api/admin/stats', 'GET');
            this.updateStatus('data-points', stats.data?.totalPoints || 'N/A');
            this.updateStatus('last-daily-post', stats.data?.lastPost || 'N/A');

        } catch (error) {
            console.error('Error loading system status:', error);
        }
    }

    populateConfig(config) {
        if (!config || !config.schedules) return;

        const schedules = config.schedules;

        // Populate API key configuration
        if (config.environment) {
            if (config.environment.apiKeyExpiry) {
                const expiryDate = new Date(config.environment.apiKeyExpiry);
                const localDateTime = new Date(expiryDate.getTime() - expiryDate.getTimezoneOffset() * 60000)
                    .toISOString()
                    .slice(0, 16);
                document.getElementById('api-expiry-date').value = localDateTime;
            }
            if (config.environment.warningDays) {
                document.getElementById('warning-days').value = config.environment.warningDays;
            }
        }

        // Daily configuration
        if (schedules.daily) {
            document.getElementById('daily-enabled').checked = schedules.daily.enabled;
            document.getElementById('daily-time').value = schedules.daily.time || '17:00';

            // Set day checkboxes
            const days = schedules.daily.days || [];
            document.querySelectorAll('.days-selector input[type="checkbox"]').forEach(cb => {
                cb.checked = days.includes(cb.value);
            });

            // Platform settings
            if (schedules.daily.platforms) {
                document.getElementById('daily-nostr').checked = schedules.daily.platforms.nostr?.enabled || false;
                document.getElementById('daily-telegram').checked = schedules.daily.platforms.telegram?.enabled || false;
            }
        }

        // Weekly configuration
        if (schedules.weekly) {
            document.getElementById('weekly-enabled').checked = schedules.weekly.enabled;
            document.getElementById('weekly-day').value = schedules.weekly.dayOfWeek || 'sunday';
            document.getElementById('weekly-time').value = schedules.weekly.time || '18:00';

            if (schedules.weekly.platforms) {
                document.getElementById('weekly-nostr').checked = schedules.weekly.platforms.nostr?.enabled || false;
                document.getElementById('weekly-telegram').checked = schedules.weekly.platforms.telegram?.enabled || false;
            }
        }

        // Monthly configuration
        if (schedules.monthly) {
            document.getElementById('monthly-enabled').checked = schedules.monthly.enabled;
            document.getElementById('monthly-day').value = schedules.monthly.dayOfMonth || '1';
            document.getElementById('monthly-time').value = schedules.monthly.time || '19:00';

            if (schedules.monthly.platforms) {
                document.getElementById('monthly-nostr').checked = schedules.monthly.platforms.nostr?.enabled || false;
                document.getElementById('monthly-telegram').checked = schedules.monthly.platforms.telegram?.enabled || false;
            }
        }

        // Annual configuration
        if (schedules.annual) {
            document.getElementById('annual-enabled').checked = schedules.annual.enabled;
            document.getElementById('annual-time').value = schedules.annual.time || '20:00';

            if (schedules.annual.platforms) {
                document.getElementById('annual-nostr').checked = schedules.annual.platforms.nostr?.enabled || false;
                document.getElementById('annual-telegram').checked = schedules.annual.platforms.telegram?.enabled || false;
            }
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
            const scheduleConfig = this.getScheduleConfig();

            const response = await this.apiCall('/api/admin/schedule', 'POST', scheduleConfig);

            if (response.success) {
                this.showMessage('Schedule configuration saved successfully!', 'success');
            } else {
                throw new Error(response.error || 'Failed to save schedule');
            }
        } catch (error) {
            this.showMessage(`Failed to save schedule: ${error.message}`, 'error');
        }
    }

    previewSchedule() {
        const config = this.getScheduleConfig();
        const preview = this.generateSchedulePreview(config);

        // Show preview in a popup or modal
        const previewText = JSON.stringify(preview, null, 2);
        alert(`Schedule Preview:\n\n${previewText}`);
    }

    getScheduleConfig() {
        // Get selected days
        const selectedDays = Array.from(document.querySelectorAll('.days-selector input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        return {
            schedules: {
                daily: {
                    enabled: document.getElementById('daily-enabled').checked,
                    time: document.getElementById('daily-time').value,
                    days: selectedDays,
                    platforms: {
                        nostr: {
                            enabled: document.getElementById('daily-nostr').checked
                        },
                        telegram: {
                            enabled: document.getElementById('daily-telegram').checked
                        }
                    }
                },
                weekly: {
                    enabled: document.getElementById('weekly-enabled').checked,
                    dayOfWeek: document.getElementById('weekly-day').value,
                    time: document.getElementById('weekly-time').value,
                    platforms: {
                        nostr: {
                            enabled: document.getElementById('weekly-nostr').checked
                        },
                        telegram: {
                            enabled: document.getElementById('weekly-telegram').checked
                        }
                    }
                },
                monthly: {
                    enabled: document.getElementById('monthly-enabled').checked,
                    dayOfMonth: document.getElementById('monthly-day').value,
                    time: document.getElementById('monthly-time').value,
                    platforms: {
                        nostr: {
                            enabled: document.getElementById('monthly-nostr').checked
                        },
                        telegram: {
                            enabled: document.getElementById('monthly-telegram').checked
                        }
                    }
                },
                annual: {
                    enabled: document.getElementById('annual-enabled').checked,
                    date: document.getElementById('annual-date').value,
                    time: document.getElementById('annual-time').value,
                    platforms: {
                        nostr: {
                            enabled: document.getElementById('annual-nostr').checked
                        },
                        telegram: {
                            enabled: document.getElementById('annual-telegram').checked
                        }
                    }
                }
            }
        };
    }

    generateSchedulePreview(config) {
        const preview = {};

        Object.entries(config.schedules).forEach(([type, schedule]) => {
            if (schedule.enabled) {
                preview[type] = {
                    time: schedule.time,
                    ...(schedule.days && { days: schedule.days }),
                    ...(schedule.dayOfWeek && { dayOfWeek: schedule.dayOfWeek }),
                    ...(schedule.dayOfMonth && { dayOfMonth: schedule.dayOfMonth }),
                    ...(schedule.date && { date: schedule.date }),
                    platforms: Object.entries(schedule.platforms)
                        .filter(([_, platform]) => platform.enabled)
                        .map(([name, platform]) => `${name} at ${platform.time}`)
                };
            }
        });

        return preview;
    }

    async saveApiConfig() {
        try {
            const config = {
                expiryDate: document.getElementById('api-expiry-date').value,
                warningDays: document.getElementById('warning-days').value
            };

            const response = await this.apiCall('/api/admin/config', 'POST', { apiKey: config });

            if (response.success) {
                this.showMessage('API key configuration saved successfully!', 'success');
            } else {
                throw new Error(response.error || 'Failed to save API configuration');
            }
        } catch (error) {
            this.showMessage(`Failed to save API configuration: ${error.message}`, 'error');
        }
    }

    async testApiKey() {
        try {
            this.showMessage('Testing API connection...', 'info');

            const response = await this.apiCall('/api/admin/test-notification', 'POST', { type: 'api-test' });

            if (response.success) {
                this.showMessage('API key test successful!', 'success');
            } else {
                throw new Error(response.error || 'API test failed');
            }
        } catch (error) {
            this.showMessage(`API test failed: ${error.message}`, 'error');
        }
    }

    async exportData() {
        try {
            const startDate = document.getElementById('export-start').value;
            const endDate = document.getElementById('export-end').value;

            if (!startDate || !endDate) {
                this.showMessage('Please select both start and end dates for export', 'warning');
                return;
            }

            const response = await this.apiCall('/api/admin/stats', 'POST', {
                action: 'export',
                startDate,
                endDate
            });

            if (response.success && response.data.csv) {
                this.downloadCSV(response.data.csv, `strichbot-data-${startDate}-to-${endDate}.csv`);
                this.showMessage('Data exported successfully!', 'success');
            } else {
                throw new Error(response.error || 'Export failed');
            }
        } catch (error) {
            this.showMessage(`Export failed: ${error.message}`, 'error');
        }
    }

    downloadCSV(csvContent, filename) {
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');

        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    }

    async cleanupData() {
        if (!confirm('Are you sure you want to clean up old data? This action cannot be undone.')) {
            return;
        }

        try {
            const response = await this.apiCall('/api/admin/stats', 'POST', { action: 'cleanup' });

            if (response.success) {
                this.showMessage(`Data cleanup completed. ${response.data.deletedCount} files deleted.`, 'success');
                this.loadSystemStatus(); // Refresh status
            } else {
                throw new Error(response.error || 'Cleanup failed');
            }
        } catch (error) {
            this.showMessage(`Cleanup failed: ${error.message}`, 'error');
        }
    }

    async testTelegram() {
        try {
            this.showMessage('Sending test Telegram message...', 'info');

            const response = await this.apiCall('/api/admin/test-notification', 'POST', { type: 'telegram' });

            if (response.success) {
                this.showMessage('Test Telegram message sent successfully!', 'success');
            } else {
                throw new Error(response.error || 'Telegram test failed');
            }
        } catch (error) {
            this.showMessage(`Telegram test failed: ${error.message}`, 'error');
        }
    }

    async testNostr() {
        try {
            const useTestProfile = document.getElementById('use-test-nostr').checked;
            this.showMessage(`Sending test Nostr event${useTestProfile ? ' (using test profile)' : ''}...`, 'info');

            const response = await this.apiCall('/api/admin/test-notification', 'POST', {
                type: 'nostr',
                useTestProfile
            });

            if (response.success) {
                this.showMessage(`Test Nostr event published successfully${useTestProfile ? ' to test profile' : ''}!`, 'success');
            } else {
                throw new Error(response.error || 'Nostr test failed');
            }
        } catch (error) {
            this.showMessage(`Nostr test failed: ${error.message}`, 'error');
        }
    }

    async generateReport(type) {
        try {
            this.showMessage(`Generating ${type} report...`, 'info');

            const response = await this.apiCall(`/api/${type}-report`, 'POST');

            if (response.success) {
                this.showMessage(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated and posted successfully!`, 'success');
            } else {
                throw new Error(response.error || `${type} report generation failed`);
            }
        } catch (error) {
            this.showMessage(`${type} report failed: ${error.message}`, 'error');
        }
    }

    async checkApis() {
        try {
            this.showMessage('Checking all API connections...', 'info');

            const response = await this.apiCall('/api/admin/test-notification', 'POST', { type: 'health-check' });

            if (response.success) {
                this.showMessage('All API checks completed. See console for details.', 'success');
                console.log('API Health Check Results:', response.data);
            } else {
                throw new Error(response.error || 'Health check failed');
            }
        } catch (error) {
            this.showMessage(`Health check failed: ${error.message}`, 'error');
        }
    }

    async viewLogs() {
        // This would typically open a log viewer
        // For now, we'll just show a message
        this.showMessage('Log viewer functionality would be implemented here', 'info');
    }

    async apiCall(endpoint, method = 'GET', data = null, token = null) {
        const headers = {
            'Content-Type': 'application/json',
            'X-API-Key': token || this.token || ''
        };

        const options = {
            method,
            headers
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(`${this.baseUrl}${endpoint}`, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.json();
    }

    showMessage(message, type = 'info') {
        const container = document.getElementById('status-messages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message ${type}`;
        messageDiv.textContent = message;

        container.appendChild(messageDiv);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

// Initialize the dashboard when the page loads
document.addEventListener('DOMContentLoaded', () => {
    new AdminDashboard();
});