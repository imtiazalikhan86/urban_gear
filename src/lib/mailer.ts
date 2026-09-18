import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
}

const transporter = env.SMTP_HOST
  ? nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_SECURE,
      auth: env.SMTP_USER && env.SMTP_PASSWORD ? { user: env.SMTP_USER, pass: env.SMTP_PASSWORD } : undefined,
    })
  : null;

/**
 * Sends transactional mail. Without SMTP configured the message is logged instead, so local
 * development can follow a reset link without an email provider. Production start-up requires
 * SMTP_HOST, so this fallback cannot silently swallow live reset emails.
 */
export async function sendMail(message: MailMessage): Promise<void> {
  if (!transporter) {
    logger.warn({ to: message.to, subject: message.subject, body: message.text }, 'SMTP is not configured; logging the email instead of sending it');
    return;
  }
  await transporter.sendMail({ from: env.MAIL_FROM, ...message });
}
