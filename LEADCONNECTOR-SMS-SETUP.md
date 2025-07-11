# LeadConnector SMS Setup Guide

This guide shows how to set up LeadConnector (formerly HighLevel) for SMS messaging in The Mom App.

## Step 1: Get LeadConnector Agency API Access
**IMPORTANT: Use Agency-level API key, not sub-account key**

1. Log into your **Agency account** (main HighLevel account, not sub-account)
2. Go to Settings → Integrations → API
3. Create a new API key with these permissions:
   - `conversations.message.write`
   - `conversations.readonly` 
   - `locations.readonly`
4. Copy the Agency API key (usually starts with `eyJ` and is much longer)

**Note**: Sub-account API keys don't have sufficient permissions for SMS messaging.

## Step 2: Find Your Location ID
1. In LeadConnector, go to Settings → Business Profile
2. Copy your Location ID (also called Sub-Account ID)
3. This is usually a long string like `63f4b2c1e4b0a7f8d9c0e1f2`

## Step 3: Configure Environment Variables
Add these to your Replit Secrets:

```
LEADCONNECTOR_API_KEY=your_api_key_here
LEADCONNECTOR_LOCATION_ID=your_location_id_here
```

Optional (uses default if not set):
```
LEADCONNECTOR_BASE_URL=https://services.leadconnectorhq.com
```

## Step 4: SMS Number Setup
LeadConnector automatically uses numbers associated with your location:
- Uses your existing LeadConnector phone numbers
- No additional phone number purchase needed
- Messages appear in your LeadConnector conversations

## Advantages of LeadConnector SMS

✅ **Integrated Conversations**: All messages appear in your LeadConnector inbox
✅ **No A2P Campaign Required**: Uses your existing numbers
✅ **Familiar Interface**: Manage from your existing LeadConnector dashboard
✅ **Cost Effective**: Likely cheaper than standalone SMS services
✅ **Professional Numbers**: Uses your business phone numbers

## Pricing Comparison

| Service | Setup | A2P Campaign | Integration |
|---------|-------|-------------|-------------|
| LeadConnector | Easy | Not Required | Native |
| Twilio | Easy | Required | External |
| AWS SNS | Medium | Required | External |

## Testing

1. Add the environment variables above
2. Restart your application
3. Visit `/teen-test` to see LeadConnector in the available providers
4. Test sending an invite to verify SMS delivery

## Current Status

✅ **Agency API Key**: Successfully configured (eyJhbGciOi...)
✅ **Location ID**: Successfully extracted from JWT (Zuv4qgKlSoOyGdkVJtjr)
✅ **Provider Initialization**: LeadConnector provider loads correctly
⚠️ **API Endpoints**: All tested endpoints return 401/404 errors

### Tested Endpoints (All Failed)
- `/conversations/messages` (401 error)
- `/conversations/text` (404 error) 
- `/messaging/sms` (404 error)
- `/locations/{id}/conversations/messages` (404 error)

## Next Steps

The integration is configured correctly but the API endpoints may have changed or require different permissions. Consider:

1. **Contact LeadConnector Support** to verify the correct SMS API endpoints for Agency-level keys
2. **Check API Documentation** for any recent endpoint changes
3. **Verify Permissions** - ensure your Agency API key has SMS messaging permissions enabled
4. **Alternative**: Use Twilio (working) or AWS SNS as reliable fallbacks

## Troubleshooting

**"API key invalid" (401 errors)**
- Verify the API key has SMS messaging permissions
- Check if the API key needs to be regenerated
- Confirm you're using the Agency-level key, not sub-account key

**"Endpoint not found" (404 errors)**
- API endpoints may have changed - check latest LeadConnector documentation
- Try alternative base URLs if documented

**"Phone number not configured"**
- Ensure your LeadConnector location has at least one phone number
- Check that SMS is enabled for that number

The app will automatically prioritize LeadConnector if working, then fall back to Twilio or AWS SNS.