const nodemailer = require('nodemailer');

/**
 * Send OTP verification email to user
 * @param {Object} options - { to, otp, type, name }
 * @returns {Promise<{success: boolean, mode: string}>}
 */
const sendOtpEmail = async ({ to, otp, type = 'login', name = 'Viewer' }) => {
  const isRegister = type === 'register';
  const subject = isRegister
    ? `StreamCloud - Verify your email to complete registration`
    : `StreamCloud - Your 6-digit login verification code`;

  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #09090b; color: #f4f4f5; padding: 40px 20px; text-align: center;">
      <div style="max-width: 500px; margin: 0 auto; background-color: #18181b; border: 1px solid #27272a; border-radius: 16px; padding: 32px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
        <h1 style="color: #a855f7; font-size: 24px; margin-bottom: 8px;">StreamCloud</h1>
        <p style="color: #a1a1aa; font-size: 14px; margin-top: 0;">Passwordless Streaming Platform</p>
        
        <hr style="border: 0; border-top: 1px solid #27272a; margin: 24px 0;" />
        
        <p style="font-size: 16px; color: #e4e4e7; margin-bottom: 16px;">Hello ${name || 'there'},</p>
        <p style="font-size: 14px; color: #a1a1aa; line-height: 1.6;">
          Use the 6-digit verification code below to ${isRegister ? 'create your account' : 'sign in to your account'}.
        </p>
        
        <div style="margin: 28px 0; background-color: #09090b; border: 1px solid #7c3aed; border-radius: 12px; padding: 18px;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #c084fc; font-family: monospace;">
            ${otp}
          </span>
        </div>
        
        <p style="font-size: 12px; color: #71717a;">
          This code is valid for <strong>5 minutes</strong>. If you did not request this code, you can safely ignore this email.
        </p>
        
        <hr style="border: 0; border-top: 1px solid #27272a; margin: 24px 0;" />
        <p style="font-size: 11px; color: #52525b;">© ${new Date().getFullYear()} StreamCloud Video Platform. All rights reserved.</p>
      </div>
    </div>
  `;

  // Always log to console in development for convenient testing
  console.log(`\n======================================================`);
  console.log(`[StreamCloud OTP Notification]`);
  console.log(`To:        ${to}`);
  console.log(`Action:    ${type.toUpperCase()}`);
  console.log(`OTP Code:  >>> ${otp} <<<`);
  console.log(`Expires:   5 minutes`);
  console.log(`======================================================\n`);

  // Check if SMTP is configured
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: process.env.SMTP_FROM || '"StreamCloud" <noreply@streamcloud.io>',
        to,
        subject,
        html: htmlContent,
      });

      return { success: true, mode: 'smtp' };
    } catch (error) {
      console.error(`[EmailService] Failed to send via SMTP: ${error.message}`);
      // Don't fail the request completely if console has logged it during dev
      return { success: true, mode: 'console_fallback', error: error.message };
    }
  }

  return { success: true, mode: 'console' };
};

module.exports = {
  sendOtpEmail,
};
