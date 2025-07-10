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

export class SMSService {
  private providers: SMSProvider[] = [];

  constructor() {
    // Try to initialize providers based on available credentials
    this.initializeProviders();
  }

  private initializeProviders() {
    // Try Twilio first
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      try {
        this.providers.push(new TwilioProvider());
      } catch (error) {
        console.warn("Failed to initialize Twilio provider:", error);
      }
    }

    // Try AWS SNS
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      try {
        this.providers.push(new AWSSNSProvider());
      } catch (error) {
        console.warn("Failed to initialize AWS SNS provider:", error);
      }
    }

    if (this.providers.length === 0) {
      console.warn("No SMS providers available. Please configure Twilio or AWS SNS.");
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