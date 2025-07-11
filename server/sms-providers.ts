import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import twilio from "twilio";

export interface SMSProvider {
  sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  name: string;
}

export class TwilioProvider implements SMSProvider {
  name = "Twilio";
  private client: twilio.Twilio;

  constructor() {
    if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      throw new Error("Twilio credentials not configured");
    }
    this.client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const result = await this.client.messages.create({
        body: message,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: to
      });
      return { success: true, messageId: result.sid };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export class AWSSNSProvider implements SMSProvider {
  name = "AWS SNS";
  private client: SNSClient;

  constructor() {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error("AWS credentials not configured");
    }
    this.client = new SNSClient({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const command = new PublishCommand({
        PhoneNumber: to,
        Message: message,
        MessageAttributes: {
          'AWS.SNS.SMS.SMSType': {
            DataType: 'String',
            StringValue: 'Transactional' // Use 'Promotional' for marketing messages
          }
        }
      });

      const result = await this.client.send(command);
      return { success: true, messageId: result.MessageId };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  }
}

export class LeadConnectorProvider implements SMSProvider {
  name = "LeadConnector";
  private apiKey: string;
  private locationId: string;
  private baseUrl: string;

  constructor() {
    if (!process.env.LEADCONNECTOR_API_KEY) {
      throw new Error("LEADCONNECTOR_API_KEY is required");
    }
    if (!process.env.LEADCONNECTOR_LOCATION_ID) {
      throw new Error("LEADCONNECTOR_LOCATION_ID is required");
    }
    
    this.apiKey = process.env.LEADCONNECTOR_API_KEY;
    this.locationId = process.env.LEADCONNECTOR_LOCATION_ID;
    // Use the correct base URL for agency-level API access
    this.baseUrl = process.env.LEADCONNECTOR_BASE_URL || "https://services.leadconnectorhq.com";
    
    // Debug constructor values
    console.log(`🔧 LeadConnector constructor:`);
    console.log(`- API Key: ${this.apiKey.substring(0, 10)}...`);
    console.log(`- Location ID: ${this.locationId}`);
    console.log(`- Base URL: ${this.baseUrl}`);
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // Format phone number to E.164 format for LeadConnector
      let formattedPhone = to.replace(/\D/g, '');
      if (!formattedPhone.startsWith('1') && formattedPhone.length === 10) {
        formattedPhone = '1' + formattedPhone;
      }
      if (!formattedPhone.startsWith('+')) {
        formattedPhone = '+' + formattedPhone;
      }
      
      // Debug the LeadConnector configuration
      console.log(`🔧 LeadConnector Debug:`);
      console.log(`- Phone: ${formattedPhone}`);
      console.log(`- API Key: ${this.apiKey.substring(0, 10)}...`);
      console.log(`- Location ID: ${this.locationId}`);
      console.log(`- Base URL: ${this.baseUrl}`);
      
      // Try the correct GoHighLevel/LeadConnector SMS API endpoints
      // Method 1: Direct conversations endpoint with correct body structure
      let response = await fetch(`${this.baseUrl}/conversations/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'Version': '2021-07-28'
        },
        body: JSON.stringify({
          type: 'SMS',
          message: message,
          contactId: formattedPhone
        })
      });

      // Method 2: If first fails, try with phone instead of contactId  
      if (!response.ok) {
        console.log(`Endpoint 1 failed (${response.status}), trying with phone field...`);
        response = await fetch(`${this.baseUrl}/conversations/messages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Version': '2021-07-28'
          },
          body: JSON.stringify({
            type: 'SMS',
            message: message,
            phone: formattedPhone
          })
        });
      }

      // Method 3: Try the messaging endpoint
      if (!response.ok) {
        console.log(`Endpoint 2 failed (${response.status}), trying messaging endpoint...`);
        response = await fetch(`${this.baseUrl}/messaging/sms`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            locationId: this.locationId,
            message: message,
            phone: formattedPhone
          })
        });
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.log(`❌ All LeadConnector endpoints failed. Last error: ${response.status} - ${errorText}`);
        throw new Error(`LeadConnector API error: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        messageId: result.id || result.messageId,
      };
    } catch (error: any) {
      console.error("LeadConnector SMS error:", error);
      return {
        success: false,
        error: error.message || "Failed to send SMS via LeadConnector"
      };
    }
  }
}

export class SMSService {
  private providers: SMSProvider[] = [];

  constructor() {
    // Try to initialize providers based on available credentials
    this.initializeProviders();
  }

  public reinitialize() {
    this.providers = [];
    this.initializeProviders();
  }

  private initializeProviders() {
    // Try LeadConnector first (if available)
    if (process.env.LEADCONNECTOR_API_KEY && process.env.LEADCONNECTOR_LOCATION_ID) {
      try {
        this.providers.push(new LeadConnectorProvider());
        console.log("✅ LeadConnector SMS provider initialized");
      } catch (error) {
        console.warn("Failed to initialize LeadConnector provider:", error);
      }
    }

    // Try Twilio
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.providers.push(new TwilioProvider());
        console.log("✅ Twilio SMS provider initialized");
      } catch (error) {
        console.warn("Failed to initialize Twilio provider:", error);
      }
    }

    // Try AWS SNS
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        this.providers.push(new AWSSNSProvider());
        console.log("✅ AWS SNS provider initialized");
      } catch (error) {
        console.warn("Failed to initialize AWS SNS provider:", error);
      }
    }

    if (this.providers.length === 0) {
      console.warn("No SMS providers available. Please configure LeadConnector, Twilio, or AWS SNS.");
    } else {
      console.log(`📱 SMS service ready with ${this.providers.length} provider(s): ${this.getAvailableProviders().join(', ')}`);
    }
  }

  async sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
    if (this.providers.length === 0) {
      return { success: false, error: "No SMS providers configured" };
    }

    // Try each provider in order
    for (const provider of this.providers) {
      try {
        const result = await provider.sendSMS(to, message);
        if (result.success) {
          return { ...result, provider: provider.name };
        }
      } catch (error: any) {
        console.warn(`${provider.name} failed:`, error.message);
        continue;
      }
    }

    return { success: false, error: "All SMS providers failed" };
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}

export const smsService = new SMSService();