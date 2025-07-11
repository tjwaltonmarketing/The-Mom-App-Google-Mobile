# LeadConnector SMS Setup Guide

This guide shows how to set up LeadConnector (formerly HighLevel) for SMS messaging in The Mom App.

## Step 1: Get LeadConnector Sub-Account API Access
**IMPORTANT: Use Location-level API key, not Agency-level key**

Based on HighLevel support: "All integrations are managed at the sub-account (location) level"

1. Log into your **Sub-account** (the specific location you want to send SMS from)
2. Go to Settings → Business Profile (or Settings → Integrations)
3. Find your **Location API key** 
4. Copy the Location API key

**Note**: Agency-level API keys are only for advanced features. SMS messaging requires Location-level API keys.

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

## Current Status (Updated after HighLevel Support Response)

⚠️ **Issue Identified**: Using Agency-level API key instead of Location-level API key
✅ **Location ID**: Successfully extracted from JWT (Zuv4qgKlSoOyGdkVJtjr)
✅ **Provider Initialization**: LeadConnector provider loads correctly
⚠️ **API Authentication**: 401/404 errors due to wrong API key type

### Root Cause (Per HighLevel Support)
- "All integrations are managed at the sub-account (location) level"
- Agency-level API keys are only for advanced features
- SMS messaging requires Location-level API keys

## Next Steps

**ACTION REQUIRED**: Switch from Agency API key to Location API key

1. **Get Location API Key**: Log into your sub-account and find the Location API key in Settings → Business Profile
2. **Update Environment**: Replace current `LEADCONNECTOR_API_KEY` with the Location-level key
3. **Test SMS**: LeadConnector should work correctly with the proper API key
4. **Fallback**: Twilio continues to work as backup during the transition

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