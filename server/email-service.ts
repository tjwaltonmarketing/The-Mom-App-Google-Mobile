import sgMail from '@sendgrid/mail';

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  name: string;
}

export class SendGridProvider implements EmailProvider {
  name = "SendGrid";

  constructor() {
    if (!process.env.SENDGRID_API_KEY) {
      throw new Error('SENDGRID_API_KEY is required');
    }
    
    const apiKey = process.env.SENDGRID_API_KEY.trim();
    sgMail.setApiKey(apiKey);
    console.log('✅ SendGrid email provider initialized');
    console.log('   Key format:', apiKey.startsWith('SG.') ? 'Valid format' : 'Invalid format');
    console.log('   Key length:', apiKey.length);
    console.log('   Key preview:', `${apiKey.substring(0, 15)}...`);
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const msg = {
        to,
        from: process.env.FROM_EMAIL || 'noreply@themom.app',
        subject,
        text: text || this.htmlToText(html),
        html,
      };

      const [response] = await sgMail.send(msg);
      
      return {
        success: true,
        messageId: response.headers['x-message-id'] as string || 'sent'
      };
    } catch (error: any) {
      console.error('SendGrid email error:', error);
      console.error('SendGrid error details:', error.response?.body);
      
      // Provide specific error messages for common issues
      let errorMessage = error.message || 'Failed to send email via SendGrid';
      
      if (error.code === 403 || errorMessage.includes('Forbidden')) {
        errorMessage = 'SendGrid API key lacks Mail Send permissions. Please update your API key permissions in SendGrid dashboard.';
      } else if (error.code === 401 || errorMessage.includes('Unauthorized')) {
        errorMessage = `SendGrid authentication failed. Details: ${JSON.stringify(error.response?.body || 'No details available')}`;
      } else if (error.code === 400) {
        errorMessage = 'Invalid email parameters. Check from/to email addresses and content.';
      }
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  private htmlToText(html: string): string {
    // Basic HTML to text conversion
    return html
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<[^>]*>/g, '')
      .trim();
  }
}

export class EmailService {
  private provider: EmailProvider | null = null;

  constructor() {
    this.initializeProvider();
  }

  public reinitialize() {
    this.provider = null;
    this.initializeProvider();
  }

  private initializeProvider() {
    // Try to initialize SendGrid
    if (process.env.SENDGRID_API_KEY) {
      try {
        this.provider = new SendGridProvider();
        console.log(`📧 Email service ready with ${this.provider.name}`);
      } catch (error) {
        console.warn('Failed to initialize SendGrid provider:', error);
      }
    }

    if (!this.provider) {
      console.warn('No email providers available. Please configure SendGrid.');
    }
  }

  async sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string; provider?: string }> {
    if (!this.provider) {
      return { success: false, error: 'No email providers configured' };
    }

    try {
      const result = await this.provider.sendEmail(to, subject, html, text);
      return { ...result, provider: this.provider.name };
    } catch (error: any) {
      console.error(`${this.provider.name} failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  isConfigured(): boolean {
    return this.provider !== null;
  }

  getProvider(): string | null {
    return this.provider?.name || null;
  }
}

export const emailService = new EmailService();

// Export a simple sendEmail function for compatibility
export async function sendEmail(to: string, subject: string, content: string): Promise<boolean> {
  const result = await emailService.sendEmail(to, subject, content);
  return result.success;
}