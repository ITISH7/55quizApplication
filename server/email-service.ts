import nodemailer, { Transporter } from "nodemailer";

interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string = "";
  private fromName: string = "";

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    try {
      // AWS SES Configuration
      const emailConfig: EmailConfig = {
        host: "email-smtp.ap-south-1.amazonaws.com",
        port: 587,
        secure: false, // Use STARTTLS
        auth: {
          user: "AKIAS7VERZK2Y3HPJT7F",
          pass: "BIYGgP9PjlgB6lTMeBmeKaXaYLQleP2DSLpTLMmIc0uO",
        },
      };

      this.fromEmail = "noreply@fiftyfivetech.io"; // Verified SES email
      this.fromName = "FiftyFive Technologies";

      // Only create transporter if we have email credentials
      if (emailConfig.auth.user && emailConfig.auth.pass) {
        this.transporter = nodemailer.createTransport(emailConfig);
        console.log("Email service initialized successfully");
      } else {
        console.log("Email service not initialized - missing credentials");
      }
    } catch (error) {
      console.error("Failed to initialize email service:", error);
    }
  }

  async sendEmail(options: EmailOptions): Promise<boolean> {
    if (!this.transporter) {
      console.log("Email transporter not configured, logging email instead:");
      console.log(`To: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Content: ${options.text || "HTML email"}`);
      return false;
    }

    try {
      const mailOptions = {
        from: `${this.fromName} <${this.fromEmail}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log("Email sent successfully:", info.messageId);
      return true;
    } catch (error) {
      console.error("Failed to send email:", error);
      return false;
    }
  }

  async sendOtpEmail(email: string, otpCode: string): Promise<boolean> {
    const subject = "Your OTP Code for Quiz Login";

    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>OTP Verification</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            margin: 0;
            padding: 0;
            background-color: #f4f4f4;
          }
          .container {
            max-width: 600px;
            margin: 20px auto;
            background: linear-gradient(135deg, #ff6b35 0%, #f7931e 50%, #2e8b57 100%);
            border-radius: 10px;
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header {
            background: white;
            padding: 20px;
            text-align: center;
            border-bottom: 3px solid #ff6b35;
          }
          .content {
            background: white;
            padding: 30px 20px;
            text-align: center;
          }
          .otp-code {
            font-size: 32px;
            font-weight: bold;
            color: #ff6b35;
            background: #fff5f0;
            border: 2px dashed #ff6b35;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
            letter-spacing: 3px;
          }
          .footer {
            background: #f8f9fa;
            padding: 15px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          .warning {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            border-radius: 5px;
            padding: 10px;
            margin: 15px 0;
            color: #856404;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; color: #333;">🏆 Live Quiz Showdown</h1>
            <p style="margin: 5px 0 0; color: #666;">FiftyFive Technologies</p>
          </div>
          
          <div class="content">
            <h2 style="color: #333; margin-bottom: 20px;">Your OTP Code</h2>
            <p style="color: #555; margin-bottom: 20px;">
              Hi there! Use the following One-Time Password (OTP) to login to the Quiz Platform:
            </p>
            
            <div class="otp-code">${otpCode}</div>
            
            <div class="warning">
              <strong>⚠️ Important:</strong><br>
              • This OTP is valid for <strong>10 minutes</strong> only<br>
              • Do not share this code with anyone<br>
              • If you didn't request this OTP, please ignore this email
            </div>
            
            <p style="color: #555; margin-top: 20px;">
              Ready to test your knowledge? Let's make this quiz exciting! 🎯
            </p>
          </div>
          
          <div class="footer">
            <p>This email was sent from FiftyFive Technologies Quiz Platform</p>
            <p>© ${new Date().getFullYear()} FiftyFive Technologies. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Your OTP Code for Quiz Login

Hi there! Your One-Time Password (OTP) for the Quiz Platform is: ${otpCode}

Important:
- This OTP is valid for 10 minutes only
- Do not share this code with anyone
- If you didn't request this OTP, please ignore this email

Ready to test your knowledge? Let's make this quiz exciting!

© ${new Date().getFullYear()} FiftyFive Technologies. All rights reserved.
    `;

    return await this.sendEmail({
      to: email,
      subject,
      html,
      text,
    });
  }

  // Test email connectivity
  async testConnection(): Promise<boolean> {
    if (!this.transporter) {
      console.log("Cannot test connection - transporter not configured");
      return false;
    }

    try {
      await this.transporter.verify();
      console.log("Email service connection verified successfully");
      return true;
    } catch (error) {
      console.error("Email service connection test failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();

// Export the class for testing
export { EmailService };
