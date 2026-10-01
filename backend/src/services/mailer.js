import nodemailer from 'nodemailer';
import config from '../config.js';

/**
 * Returns { sendOtp(email, code) }.
 *  - transport "smtp":    real SMTP delivery (Mailpit in Docker, or any SMTP provider).
 *  - transport "console": prints the email to the terminal (handy without Docker).
 */
function createMailer(cfg = config.mail) {
  const transporter =
    cfg.transport === 'smtp'
      ? nodemailer.createTransport({
          host: cfg.host,
          port: cfg.port,
          secure: cfg.port === 465,
          auth: cfg.user ? { user: cfg.user, pass: cfg.pass } : undefined,
        })
      : null;

  async function sendOtp(email, code) {
    const subject = `Your PadosiPro verification code: ${code}`;
    const text = `Your PadosiPro verification code is ${code}.\nIt is valid for 10 minutes. If you did not sign up, ignore this email.`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:420px;margin:auto;padding:24px;border:1px solid #e3ebe7;border-radius:12px">
        <h2 style="color:#155C49;margin:0 0 8px">PadosiPro</h2>
        <p style="color:#444">Use this code to verify your email:</p>
        <p style="font-size:34px;letter-spacing:8px;font-weight:700;color:#155C49;margin:12px 0">${code}</p>
        <p style="color:#777;font-size:13px">Valid for 10 minutes. If you did not sign up, you can ignore this email.</p>
      </div>`;

    if (!transporter) {
      console.log(`\n[mail:console] To: ${email}\n[mail:console] ${subject}\n`);
      return;
    }
    await transporter.sendMail({ from: cfg.from, to: email, subject, text, html });
  }

  return { sendOtp };
}

export { createMailer };
