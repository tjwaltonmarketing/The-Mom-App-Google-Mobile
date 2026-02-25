import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
              Privacy Policy
            </CardTitle>
            <p className="text-center text-gray-600">Last Updated: February 25, 2026</p>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none">
            <h2>Introduction</h2>
            <p>The Mom App ("we," "us," or "our") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our mobile application and web service.</p>

            <h2>Information We Collect</h2>
            
            <h3>Personal Information</h3>
            <ul>
              <li><strong>Account Information:</strong> Name, email address, username</li>
              <li><strong>Family Information:</strong> Family member names, roles, and profile details</li>
              <li><strong>Calendar Data:</strong> Events, appointments, and scheduling information</li>
              <li><strong>Task Data:</strong> To-do lists, assignments, and completion status</li>
              <li><strong>Voice Notes:</strong> Audio recordings and transcriptions</li>
              <li><strong>Password Vault:</strong> Encrypted login credentials for family accounts</li>
            </ul>

            <h3>Automatically Collected Information</h3>
            <ul>
              <li><strong>Usage Data:</strong> App interaction patterns, feature usage, session duration</li>
              <li><strong>Device Information:</strong> Device type, operating system, app version</li>
              <li><strong>Log Data:</strong> Error reports, crash logs, performance metrics</li>
            </ul>

            <h3>Third-Party Data</h3>
            <ul>
              <li><strong>Calendar Integration:</strong> Google Calendar sync (with your permission)</li>
              <li><strong>AI Processing:</strong> OpenAI services for intelligent assistance</li>
              <li><strong>Payment Processing:</strong> Stripe for subscription management</li>
            </ul>

            <h2>How We Use Your Information</h2>
            
            <h3>Core Functionality</h3>
            <ul>
              <li>Provide family coordination and task management services</li>
              <li>Sync calendars and events across family members</li>
              <li>Process voice notes and provide AI-powered assistance</li>
              <li>Manage subscription billing and payments</li>
              <li>Store and organize family passwords securely</li>
            </ul>

            <h2>Third-Party AI Data Processing</h2>
            <p>The Mom App uses <strong>OpenAI</strong> as a third-party AI provider to power the AI Assistant and voice transcription features. When you use these features, the following personal data may be sent to OpenAI:</p>
            <ul>
              <li><strong>Messages:</strong> Text you type in the AI Assistant chat</li>
              <li><strong>Voice Transcriptions:</strong> Text from voice note transcriptions</li>
              <li><strong>Family Context:</strong> Family member names for task assignment and coordination</li>
            </ul>
            <p><strong>Where to review:</strong> You can see the AI data disclosure in the AI Assistant page under the "AI Data & Privacy" section. This section details exactly what data is sent and to which provider.</p>
            <p><strong>How OpenAI handles your data:</strong> OpenAI processes your data solely to generate responses. OpenAI does not use your data to train their models. Your data is not retained by OpenAI beyond the immediate processing of your request. For more details, see <a href="https://openai.com/policies/privacy-policy" target="_blank" rel="noopener noreferrer" className="text-pink-600 underline">OpenAI's Privacy Policy</a>.</p>

            <h2>Data Sharing and Disclosure</h2>
            
            <h3 className="text-red-600 font-bold">We DO NOT sell your personal information to third parties.</h3>

            <h3>Service Providers</h3>
            <p>We share data with trusted third-party providers who assist in app operation:</p>
            <ul>
              <li><strong>OpenAI:</strong> AI assistant and voice transcription (see "Third-Party AI Data Processing" above for details)</li>
              <li><strong>Stripe:</strong> Payment processing for subscriptions</li>
              <li><strong>Google:</strong> Calendar synchronization (only with your explicit consent)</li>
              <li><strong>Cloud Infrastructure:</strong> Secure data storage and app hosting</li>
            </ul>

            <h2>Data Security</h2>
            
            <h3>Encryption</h3>
            <ul>
              <li>All data transmitted between your device and our servers is encrypted using TLS</li>
              <li>Password vault data is encrypted with AES-256 encryption</li>
              <li>Database information is encrypted at rest</li>
              <li>Backup data is encrypted and stored securely</li>
            </ul>

            <h3>Access Controls</h3>
            <ul>
              <li>Multi-factor authentication for admin access</li>
              <li>Role-based permissions within family groups</li>
              <li>Regular security audits and monitoring</li>
              <li>SOC 2 Type 2 certified infrastructure</li>
            </ul>

            <h2>Your Rights and Choices</h2>
            
            <h3>Data Access and Control</h3>
            <ul>
              <li><strong>Access:</strong> Request a copy of your personal information</li>
              <li><strong>Correction:</strong> Update or correct inaccurate information</li>
              <li><strong>Deletion:</strong> Request deletion of your personal data</li>
              <li><strong>Portability:</strong> Export your data in a readable format</li>
              <li><strong>Restriction:</strong> Limit how we process your information</li>
            </ul>

            <h2>Contact Information</h2>
            <p>If you have questions about this Privacy Policy, please contact us at:</p>
            <ul>
              <li><strong>Email:</strong> privacy@themomapp.com</li>
              <li><strong>Website:</strong> https://themomapp.com/contact</li>
            </ul>

            <h2>Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date.</p>

            <hr className="my-8" />
            <p className="text-sm text-gray-600"><strong>This privacy policy is effective as of the last updated date above and applies to all users of The Mom App.</strong></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}