import { query, queryOne } from './database.js';

async function getApiKeyConfig() {
  try {
    const row = await queryOne(
      'SELECT expiry_date, warning_days FROM api_key_config WHERE id = 1'
    );

    if (!row) {
      return {
        expiryDate: process.env.AMBOSS_API_KEY_EXPIRY_DATE || null,
        warningDays: process.env.API_KEY_WARNING_DAYS || '7,3,1'
      };
    }

    return {
      expiryDate: row.expiry_date,
      warningDays: row.warning_days || '7,3,1'
    };
  } catch (error) {
    console.error('Error loading API key config:', error);
    return {
      expiryDate: process.env.AMBOSS_API_KEY_EXPIRY_DATE || null,
      warningDays: process.env.API_KEY_WARNING_DAYS || '7,3,1'
    };
  }
}

async function saveApiKeyConfig(expiryDate, warningDays) {
  try {
    await query(
      `INSERT INTO api_key_config (id, key_name, expiry_date, warning_days)
       VALUES (1, 'amboss_api', ?, ?)
       ON DUPLICATE KEY UPDATE
       expiry_date = VALUES(expiry_date),
       warning_days = VALUES(warning_days)`,
      [expiryDate, warningDays]
    );
    return true;
  } catch (error) {
    console.error('Error saving API key config:', error);
    return false;
  }
}

export {
  getApiKeyConfig,
  saveApiKeyConfig
};