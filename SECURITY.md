# StrichBot Security Documentation

## Overview

StrichBot implements multi-layer security to prevent unauthorized access, spam, and abuse of API endpoints while maintaining functionality for legitimate automated cron jobs and authorized testing.

## Security Features

### 1. Rate Limiting

**Posting Endpoints** (`/api/post-stats`, `/api/telegram-post`):
- **Unauthenticated requests**: 3 requests per hour per IP
- **Authenticated requests**: No rate limiting
- **Window**: Sliding 1-hour window
- **Response**: HTTP 429 with `Retry-After` header

**Read-only Endpoints** (`/api/version`):
- **All requests**: 60 requests per hour per IP
- **No authentication required**

### 2. Authentication System

#### Cron Secret Authentication
- **Environment Variable**: `CRON_SECRET`
- **Header**: `X-Cron-Secret: your-secret-here`
- **Purpose**: Authenticates legitimate Vercel cron jobs
- **Bypasses**: Rate limiting for posting endpoints

#### API Key Authentication
- **Environment Variable**: `API_KEY`
- **Header**: `X-API-Key: your-key-here`
- **Purpose**: Allows authorized manual testing
- **Bypasses**: Rate limiting for posting endpoints

### 3. Request Validation

#### HTTP Methods
- **Posting endpoints**: GET, POST only
- **Version endpoint**: GET only
- **Invalid methods**: HTTP 405 Method Not Allowed

#### User-Agent Filtering
**Blocked patterns**:
- Empty user agents
- Generic bots (`bot`, `crawler`, `spider`, `scraper`)
- Command-line tools (`curl`, `wget`, `python-requests`)
- Automated clients (`go-http-client`)

**Allowed patterns**:
- Web browsers (`mozilla`, `chrome`, `safari`, `firefox`, `edge`)
- Vercel infrastructure
- Testing tools (`postman`)

### 4. Security Headers

Applied to all responses:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';`

### 5. CORS Policy

**Strict Origin Control**:
- Production: `https://strichbot.vercel.app` only
- No wildcard (`*`) access
- Specific allowed headers: `Content-Type`, `X-Cron-Secret`, `X-API-Key`

## Environment Variables

### Required for Security

```bash
# Cron job authentication (recommended)
CRON_SECRET=your-secure-random-string

# Manual testing authentication (optional)
API_KEY=your-api-key-here
```

### Generation Recommendations

```bash
# Generate secure cron secret (32 characters)
openssl rand -hex 32

# Generate API key (40 characters)
openssl rand -base64 40
```

## Authentication Usage

### For Vercel Cron Jobs

Add to `vercel.json` headers:
```json
{
  "crons": [
    {
      "path": "/api/post-stats",
      "schedule": "0 17 * * *",
      "headers": {
        "X-Cron-Secret": "$CRON_SECRET"
      }
    }
  ]
}
```

### For Manual Testing

```bash
# Authenticated request (bypasses rate limiting)
curl -H "X-API-Key: your-api-key" https://strichbot.vercel.app/api/post-stats

# Unauthenticated request (rate limited)
curl https://strichbot.vercel.app/api/post-stats
```

## Security Responses

### Rate Limit Exceeded
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "timestamp": "2025-09-21T17:00:00.000Z"
}
```

**Headers**:
- `Status: 429 Too Many Requests`
- `Retry-After: 3600` (seconds until reset)
- `X-RateLimit-Limit: 3`
- `X-RateLimit-Remaining: 0`
- `X-RateLimit-Reset: 1758470400` (Unix timestamp)

### Forbidden User Agent
```json
{
  "success": false,
  "error": "Forbidden: Suspicious user agent detected",
  "timestamp": "2025-09-21T17:00:00.000Z"
}
```

**Status**: `403 Forbidden`

### Method Not Allowed
```json
{
  "success": false,
  "error": "Method not allowed",
  "timestamp": "2025-09-21T17:00:00.000Z"
}
```

**Headers**:
- `Status: 405 Method Not Allowed`
- `Allow: GET, POST`

## Implementation Details

### Rate Limiting Algorithm
- **Type**: Sliding window counter
- **Storage**: In-memory Map (per serverless instance)
- **Cleanup**: Automatic hourly cleanup of old entries
- **Key Format**: `ip:{client-ip}`

### IP Address Detection
**Priority order**:
1. `X-Forwarded-For` header (first IP)
2. `X-Real-IP` header
3. `req.connection.remoteAddress`
4. `req.socket.remoteAddress`
5. `'unknown'` fallback

### Performance Impact
- **Memory**: ~100 bytes per unique IP per hour
- **CPU**: Minimal overhead (O(1) lookups)
- **Latency**: <1ms additional processing time

## Monitoring and Logs

### Security Events Logged
- Rate limit violations with IP address
- Authentication status (authenticated/rate-limited)
- Blocked user agents
- Method violations

### Log Format
```
StrichBot v1.0.0+abc123: Starting [operation] (authenticated, IP: 192.168.1.1)
StrichBot v1.0.0+abc123: Starting [operation] (rate-limited, IP: 192.168.1.1)
```

## Bypass Scenarios

### Legitimate Cron Jobs
- **Header**: `X-Cron-Secret` with valid secret
- **Result**: Full access, no rate limiting
- **Logging**: Marked as "authenticated"

### Authorized Testing
- **Header**: `X-API-Key` with valid key
- **Result**: Full access, no rate limiting
- **Logging**: Marked as "authenticated"

### Unauthenticated Access
- **Limitation**: 3 requests per hour for posting endpoints
- **Purpose**: Allow minimal testing while preventing abuse
- **Logging**: Marked as "rate-limited"

## Security Considerations

### Rate Limit Evasion
- **IP Rotation**: Attackers with multiple IPs can bypass limits
- **Mitigation**: Monitor logs for distributed patterns
- **Additional**: Consider implementing CAPTCHA for repeated violations

### Authentication Token Security
- **Storage**: Use Vercel environment variables only
- **Rotation**: Regenerate tokens periodically
- **Scope**: Cron secret should only be known to Vercel infrastructure

### DoS Protection
- **Layer**: Rate limiting provides basic DoS protection
- **Limitation**: Per-IP limits may not prevent distributed attacks
- **Recommendation**: Monitor Vercel function execution costs

## Future Enhancements

### Planned Improvements
1. **Redis Backend**: For distributed rate limiting across serverless instances
2. **Geo-blocking**: Block requests from specific countries/regions
3. **Reputation System**: Track and block repeat offenders
4. **Webhook Validation**: Verify requests come from specific sources
5. **CAPTCHA Integration**: For suspicious activity patterns

### Monitoring Integration
1. **Alerting**: Email/Slack notifications for security violations
2. **Analytics**: Dashboard for security metrics
3. **Threat Intelligence**: Integration with IP reputation services

## Compliance

This security implementation follows:
- **OWASP API Security Top 10**
- **Vercel Security Best Practices**
- **Rate Limiting Standards (RFC 6585)**
- **HTTP Security Headers Standards**

## Contact

For security concerns or questions:
- Review this documentation
- Check Vercel function logs
- Open GitHub issue for non-sensitive matters