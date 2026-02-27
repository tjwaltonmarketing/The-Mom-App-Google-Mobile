import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-orange-50 p-4">
      <div className="max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-bold text-center bg-gradient-to-r from-pink-600 to-pink-500 bg-clip-text text-transparent">
              Terms of Service
            </CardTitle>
            <p className="text-center text-gray-600">Last Updated: December 8, 2024</p>
          </CardHeader>
          <CardContent className="prose prose-lg max-w-none">
            <h2>Agreement to Terms</h2>
            <p>By accessing or using The Mom App, you agree to be bound by these Terms of Service. If you disagree with any part of these terms, you may not access the service.</p>

            <h2>Description of Service</h2>
            <p>The Mom App is a family coordination platform that provides:</p>
            <ul>
              <li>Task management and scheduling</li>
              <li>Calendar synchronization and event planning</li>
              <li>Voice note recording and AI-powered assistance</li>
              <li>Secure password management for family accounts</li>
              <li>Family member coordination tools</li>
            </ul>

            <h2>User Accounts</h2>
            
            <h3>Account Creation</h3>
            <ul>
              <li>You must provide accurate and complete information</li>
              <li>You are responsible for maintaining account security</li>
              <li>You must notify us immediately of any unauthorized access</li>
              <li>One account per user; sharing accounts is prohibited</li>
            </ul>

            <h2>Acceptable Use</h2>
            
            <h3>Permitted Uses</h3>
            <ul>
              <li>Personal family coordination and organization</li>
              <li>Sharing information within your family group</li>
              <li>Using AI assistance for legitimate family planning</li>
              <li>Storing family passwords in the secure vault</li>
            </ul>

            <h3>Prohibited Uses</h3>
            <ul>
              <li>Violating any applicable laws or regulations</li>
              <li>Sharing accounts or login credentials with non-family members</li>
              <li>Attempting to gain unauthorized access to other accounts</li>
              <li>Using the service for commercial purposes without permission</li>
              <li>Uploading malicious code or harmful content</li>
            </ul>

            <h2>Privacy and Data Protection</h2>
            <p>Your privacy is important to us. Our Privacy Policy explains how we collect, use, and protect your information. By using our service, you consent to our privacy practices.</p>

            <h2>Subscription and Billing</h2>
            
            <h3>Free Trial</h3>
            <ul>
              <li>New users receive a free trial period</li>
              <li>No payment required during trial</li>
              <li>Trial automatically converts to paid subscription unless cancelled</li>
            </ul>

            <h3>Paid Subscriptions</h3>
            <ul>
              <li><strong>Individual Plan:</strong> $5.99/month or $59.99/year - Single user account</li>
              <li><strong>Family Plan:</strong> $9.99/month or $99.99/year - Up to 4 coordinating adults</li>
              <li>Subscriptions are billed monthly or annually</li>
              <li>Payment processed through Apple In-App Purchase (iOS) or Stripe (web/Android)</li>
              <li>Automatic renewal unless cancelled</li>
            </ul>

            <h2>Intellectual Property</h2>
            
            <h3>Our Rights</h3>
            <ul>
              <li>The Mom App and its content are protected by copyright and trademark laws</li>
              <li>You may not copy, modify, or distribute our proprietary content</li>
              <li>All trademarks and service marks belong to their respective owners</li>
            </ul>

            <h3>Your Content</h3>
            <ul>
              <li>You retain ownership of content you upload to the service</li>
              <li>You grant us license to use your content to provide the service</li>
              <li>You are responsible for ensuring you have rights to uploaded content</li>
            </ul>

            <h2>Limitation of Liability</h2>
            <p>To the maximum extent permitted by law, The Mom App shall not be liable for any indirect, incidental, special, or consequential damages resulting from your use of the service.</p>

            <h2>Contact Information</h2>
            <p>Questions about these Terms of Service should be directed to:</p>
            <ul>
              <li><strong>Email:</strong> legal@themomapp.com</li>
              <li><strong>Website:</strong> https://themomapp.com/contact</li>
            </ul>

            <h2>Changes to Terms</h2>
            <p>We reserve the right to modify these terms at any time. Changes will be effective immediately upon posting. Continued use of the service constitutes acceptance of modified terms.</p>

            <hr className="my-8" />
            <p className="text-sm text-gray-600"><strong>These terms are effective as of the last updated date above and apply to all users of The Mom App.</strong></p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}