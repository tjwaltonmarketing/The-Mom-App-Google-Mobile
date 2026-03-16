import sgMail from '@sendgrid/mail';

export interface EmailProvider {
  sendEmail(to: string, subject: string, html: string, text?: string): Promise<{ success: boolean; messageId?: string; error?: string }>;
  name: string;
}

export function createBrandedEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f9f0f7;font-family:Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f9f0f7;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#EC4899,#A855F7);padding:32px 40px;text-align:center;">
              <img src="https://app.themom.app/favicon.png" alt="The Mom App" width="56" height="56" style="border-radius:12px;margin-bottom:12px;display:block;margin-left:auto;margin-right:auto;" />
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:2px;">THE MOM APP</h1>
              <p style="margin:4px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">Mom Life. Made Easy.</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:40px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#fdf4fb;padding:24px 40px;border-top:1px solid #f0e0ec;text-align:center;">
              <p style="margin:0 0 6px;color:#9b72aa;font-size:13px;font-weight:600;">The Mom App Team</p>
              <p style="margin:0 0 6px;color:#b896c8;font-size:12px;">
                <a href="mailto:team@themom.app" style="color:#b896c8;text-decoration:none;">team@themom.app</a>
              </p>
              <p style="margin:12px 0 0;color:#c4a3d4;font-size:11px;">
                © ${new Date().getFullYear()} The Mom App. All rights reserved.<br/>
                <a href="https://themom.app" style="color:#c4a3d4;text-decoration:none;">themom.app</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
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
        from: process.env.FROM_EMAIL || 'team@themom.app',
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

export async function sendEmail(to: string, subject: string, content: string): Promise<boolean> {
  const result = await emailService.sendEmail(to, subject, content);
  return result.success;
}
