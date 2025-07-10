# LeadConnector SMS Setup Guide

This guide shows how to set up LeadConnector (formerly HighLevel) for SMS messaging in The Mom App.

## Step 1: Get LeadConnector API Access
1. Log into your LeadConnector/HighLevel account
2. Go to Settings → Integrations → API
3. Create a new API key with SMS permissions
4. Copy the API key (starts with `sk_` or similar)

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

## Troubleshooting

**"API key invalid"**
- Verify the API key is correct and has SMS permissions
- Check that the key isn't expired

**"Location ID not found"**
- Verify the Location ID matches your LeadConnector sub-account
- Make sure the API key has access to this location

**"Phone number not configured"**
- Ensure your LeadConnector location has at least one phone number
- Check that SMS is enabled for that number

The app will automatically prioritize LeadConnector if configured, then fall back to Twilio or AWS SNS if needed.