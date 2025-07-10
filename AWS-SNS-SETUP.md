# AWS SNS SMS Setup Guide

This guide walks you through setting up AWS SNS for SMS messaging as an alternative to Twilio.

## Step 1: Create AWS Account
1. Go to [aws.amazon.com](https://aws.amazon.com)
2. Click "Create AWS Account"
3. Complete registration (requires credit card, but SMS costs are very low)

## Step 2: Create IAM User for SMS
1. Go to AWS Console → IAM → Users → "Create user"
2. User name: `themomapp-sms`
3. Select "Attach policies directly"
4. Search and attach: `AmazonSNSFullAccess`
5. Create user

## Step 3: Generate Access Keys
1. Click on your new user → "Security credentials"
2. Click "Create access key"
3. Choose "Application running outside AWS"
4. Copy the Access Key ID and Secret Access Key

## Step 4: Configure Environment Variables
Add these to your Replit Secrets:

```
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
AWS_REGION=us-east-1
```

## Step 5: SMS Sandbox (Testing)
- AWS starts in "sandbox mode" - can only send to verified numbers
- To verify a number: SNS Console → Text messaging → Phone numbers → Add
- Enter your phone number and confirm the verification code

## Step 6: Request Production Access
Once ready for real users:
1. SNS Console → Text messaging → Spend thresholds
2. Request to increase spending threshold above $1.00
3. AWS will review and approve (usually within 1 business day)

## Pricing Comparison

| Service | Cost per SMS | Monthly Fee | Setup |
|---------|-------------|-------------|-------|
| AWS SNS | $0.0065 | $0 | Medium |
| Twilio | $0.0075 | $0 | Easy |

## Phone Number Options

**Option 1: No Dedicated Number (Shared Pool)**
- Cheapest option
- Uses AWS shared numbers
- Good for notifications

**Option 2: Dedicated Number**
- $2/month for your own number
- More professional
- Better for branding

## Environment Variables Summary

Required for AWS SNS:
- `AWS_ACCESS_KEY_ID` - Your IAM user's access key
- `AWS_SECRET_ACCESS_KEY` - Your IAM user's secret key  
- `AWS_REGION` - AWS region (us-east-1 recommended)

The app will automatically use AWS SNS if these are configured, or fall back to Twilio if available.

## Testing

Visit `/teen-test` to see which SMS providers are active and test the integration.