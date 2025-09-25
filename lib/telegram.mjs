/**
 * ES Module wrapper for telegram.js
 * This allows ES modules to import the CommonJS telegram functions
 */

import { createRequire } from 'module';
const require = createRequire(import.meta.url);

const telegramModule = require('./telegram.js');

export const {
  sendMessage,
  formatStatsMessageForTelegram,
  validateTelegramConfig
} = telegramModule;