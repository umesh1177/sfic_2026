/**
 * Production Real Mobile SMS OTP Service
 * Supports:
 *  - Twilio Programmable SMS (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM_NUMBER / TWILIO_MESSAGING_SERVICE_SID)
 *  - 2Factor.in India OTP (TWOFACTOR_API_KEY)
 *  - Fast2SMS India OTP (FAST2SMS_API_KEY, optional FAST2SMS_ROUTE=q|otp)
 *  - MSG91 India OTP (MSG91_AUTH_KEY, MSG91_TEMPLATE_ID)
 *  - Textbelt (TEXTBELT_API_KEY)
 *  - Custom SMS Webhook (SMS_WEBHOOK_URL, optional SMS_WEBHOOK_AUTH)
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

export interface SmsDeliveryResult {
  delivered: boolean;
  provider: string;
  messageId?: string;
  error?: string;
  requiresConfiguration?: boolean;
  fallbackToOnScreen?: boolean;
  verifyMode?: boolean;
  verifyServiceSid?: string;
}

export class SmsService {
  private static cachedTwilioVerifyServiceSid: string | null = null;
  private static preferTwilioVerify = false;

  /**
   * Reload backend/.env if SMS credentials were added after server startup.
   */
  private static refreshEnvIfNeeded(): void {
    const candidates = [
      path.resolve(process.cwd(), '.env'),
      path.resolve(process.cwd(), 'backend', '.env'),
      path.resolve(process.cwd(), '..', 'backend', '.env')
    ];
    for (const p of candidates) {
      if (fs.existsSync(p)) {
        dotenv.config({ path: p, override: true });
        break;
      }
    }
  }

  /**
   * Detect the active configured SMS provider from environment variables.
   */
  public static getConfiguredProvider(): string | null {
    this.refreshEnvIfNeeded();
    const explicit = (process.env.SMS_PROVIDER || '').trim().toLowerCase();
    if (explicit === 'mock' || explicit === 'local' || explicit === 'demo' || explicit === 'none' || explicit === 'disabled') {
      return null;
    }
    if (explicit && explicit !== 'auto') return explicit;

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      (process.env.TWILIO_FROM_NUMBER ||
        process.env.TWILIO_MESSAGING_SERVICE_SID ||
        process.env.TWILIO_VERIFY_SERVICE_SID)
    ) {
      return 'twilio';
    }
    if (process.env.TWOFACTOR_API_KEY) return '2factor';
    if (process.env.FAST2SMS_API_KEY) return 'fast2sms';
    if (process.env.MSG91_AUTH_KEY) return 'msg91';
    if (process.env.TEXTBELT_API_KEY) return 'textbelt';
    if (process.env.SMS_WEBHOOK_URL) return 'webhook';
    return null;
  }

  /**
   * Send a real 6-digit OTP SMS to an Indian/E.164 mobile number (e.g. +919876543210).
   */
  public static async sendOtp(
    normalizedPhone: string,
    otpCode: string,
    purpose: 'signup' | 'password_reset' = 'signup'
  ): Promise<SmsDeliveryResult> {
    const provider = this.getConfiguredProvider();
    const digits10 = normalizedPhone.replace(/\D/g, '').slice(-10);
    const e164 = normalizedPhone.startsWith('+') ? normalizedPhone : `+91${digits10}`;

    const actionLabel = purpose === 'password_reset' ? 'password reset' : 'registration';
    const messageBody = `Your Swachh Setu (Navsari Municipal Corporation) OTP for ${actionLabel} is ${otpCode}. Valid for 5 minutes. Do not share this code with anyone.`;

    if (!provider) {
      console.warn(
        `[SMS SERVICE] No SMS provider configured in backend/.env. Using on-screen OTP fallback for ${e164}.`
      );
      return {
        delivered: false,
        fallbackToOnScreen: true,
        provider: 'unconfigured',
        requiresConfiguration: false,
        error:
          'SMS gateway credentials not configured on server. Falling back to on-screen verification OTP.'
      };
    }

    try {
      switch (provider) {
        case 'twilio':
          return await this.sendViaTwilio(e164, messageBody);
        case '2factor':
          return await this.sendViaTwoFactor(e164, otpCode);
        case 'fast2sms':
          return await this.sendViaFast2Sms(digits10, otpCode, messageBody);
        case 'msg91':
          return await this.sendViaMsg91(e164, otpCode);
        case 'textbelt':
          return await this.sendViaTextbelt(e164, messageBody);
        case 'webhook':
          return await this.sendViaWebhook(e164, otpCode, messageBody, purpose);
        default:
          return {
            delivered: false,
            fallbackToOnScreen: true,
            provider,
            error: `Unsupported SMS_PROVIDER "${provider}". Use twilio, 2factor, fast2sms, msg91, textbelt, or webhook.`
          };
      }
    } catch (err: any) {
      const errMsg = String(err?.message || `Failed to dispatch SMS via ${provider}`);
      console.warn(
        `[SMS SERVICE] Real SMS dispatch via ${provider} failed (${errMsg}). Activating automatic on-screen fallback OTP for ${e164}.`
      );

      return {
        delivered: false,
        fallbackToOnScreen: true,
        provider: `${provider}_fallback`,
        error: errMsg
      };
    }
  }

  private static async sendViaTwilio(to: string, body: string): Promise<SmsDeliveryResult> {
    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    const from = (process.env.TWILIO_FROM_NUMBER || '').trim();
    const messagingServiceSid = (process.env.TWILIO_MESSAGING_SERVICE_SID || '').trim();
    const verifyServiceSid = (process.env.TWILIO_VERIFY_SERVICE_SID || '').trim();

    // Use Twilio Verify API directly if configured or previously detected as required by Trial template rules
    if (verifyServiceSid || this.preferTwilioVerify || (!from && !messagingServiceSid)) {
      return await this.sendViaTwilioVerify(to, sid, token);
    }

    const params = new URLSearchParams();
    params.set('To', to);
    params.set('Body', body);
    if (messagingServiceSid) {
      params.set('MessagingServiceSid', messagingServiceSid);
    } else {
      params.set('From', from);
    }

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');
    const resp = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: params.toString()
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      const msg = String(data?.message || `Twilio SMS failed with HTTP ${resp.status}`);
      const isTrialTemplateError =
        /template|predefined|trial accounts/i.test(msg) || Number(data?.code) === 21659;

      if (isTrialTemplateError) {
        console.warn(
          `[SMS SERVICE] Twilio Trial template restriction detected ("${msg}"). Switching automatically to Twilio Verify API...`
        );
        this.preferTwilioVerify = true;
        return await this.sendViaTwilioVerify(to, sid, token);
      }

      throw new Error(msg);
    }

    console.log(`[SMS SERVICE] Twilio SMS sent to ${to} (SID: ${data.sid})`);
    return { delivered: true, provider: 'twilio', messageId: data.sid };
  }

  /**
   * Auto-discover or auto-create a Twilio Verify v2 Service (works on Twilio Free Trial accounts
   * without custom template restrictions).
   */
  private static async getOrCreateTwilioVerifyServiceSid(
    sid: string,
    token: string
  ): Promise<string> {
    const envServiceSid = (process.env.TWILIO_VERIFY_SERVICE_SID || '').trim();
    if (envServiceSid) return envServiceSid;
    if (this.cachedTwilioVerifyServiceSid) return this.cachedTwilioVerifyServiceSid;

    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    // 1. Check if an existing Verify Service already exists on the Twilio account
    const listResp = await fetch('https://verify.twilio.com/v2/Services?PageSize=20', {
      method: 'GET',
      headers: { Authorization: `Basic ${auth}` }
    });
    const listData: any = await listResp.json().catch(() => ({}));
    if (listResp.ok && Array.isArray(listData?.services) && listData.services.length > 0) {
      const existingSid = String(listData.services[0].sid || '');
      if (existingSid) {
        this.cachedTwilioVerifyServiceSid = existingSid;
        console.log(`[SMS SERVICE] Reusing Twilio Verify Service: ${existingSid}`);
        return existingSid;
      }
    }

    // 2. Otherwise create a new Verify Service automatically
    const createParams = new URLSearchParams();
    createParams.set('FriendlyName', 'Swachh Setu');
    createParams.set('CodeLength', '6');

    const createResp = await fetch('https://verify.twilio.com/v2/Services', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: createParams.toString()
    });
    const createData: any = await createResp.json().catch(() => ({}));
    if (!createResp.ok || !createData?.sid) {
      throw new Error(
        createData?.message || `Failed to create Twilio Verify Service (HTTP ${createResp.status})`
      );
    }

    this.cachedTwilioVerifyServiceSid = String(createData.sid);
    console.log(`[SMS SERVICE] Created Twilio Verify Service: ${this.cachedTwilioVerifyServiceSid}`);
    return this.cachedTwilioVerifyServiceSid;
  }

  /**
   * Dispatch a real 6-digit OTP SMS via Twilio Verify v2 API.
   */
  private static async sendViaTwilioVerify(
    toE164: string,
    sid: string,
    token: string
  ): Promise<SmsDeliveryResult> {
    const serviceSid = await this.getOrCreateTwilioVerifyServiceSid(sid, token);
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const params = new URLSearchParams();
    params.set('To', toE164);
    params.set('Channel', 'sms');

    const resp = await fetch(
      `https://verify.twilio.com/v2/Services/${encodeURIComponent(serviceSid)}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: params.toString()
      }
    );

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.message || `Twilio Verify SMS failed with HTTP ${resp.status}`);
    }

    console.log(
      `[SMS SERVICE] Twilio Verify OTP SMS sent to ${toE164} (SID: ${data.sid}, Service: ${serviceSid})`
    );
    return {
      delivered: true,
      provider: 'twilio_verify',
      messageId: data.sid,
      verifyMode: true,
      verifyServiceSid: serviceSid
    };
  }

  /**
   * Verify a user-entered 6-digit OTP against Twilio Verify v2 API.
   */
  public static async verifyTwilioCode(
    normalizedPhone: string,
    code: string,
    serviceSid?: string
  ): Promise<boolean> {
    this.refreshEnvIfNeeded();
    const sid = (process.env.TWILIO_ACCOUNT_SID || '').trim();
    const token = (process.env.TWILIO_AUTH_TOKEN || '').trim();
    if (!sid || !token) return false;

    const digits10 = normalizedPhone.replace(/\D/g, '').slice(-10);
    const e164 = normalizedPhone.startsWith('+') ? normalizedPhone : `+91${digits10}`;
    const resolvedServiceSid =
      serviceSid || (await this.getOrCreateTwilioVerifyServiceSid(sid, token));
    const auth = Buffer.from(`${sid}:${token}`).toString('base64');

    const params = new URLSearchParams();
    params.set('To', e164);
    params.set('Code', code.trim());

    try {
      const resp = await fetch(
        `https://verify.twilio.com/v2/Services/${encodeURIComponent(resolvedServiceSid)}/VerificationCheck`,
        {
          method: 'POST',
          headers: {
            Authorization: `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: params.toString()
        }
      );

      const data: any = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        console.warn(
          `[SMS SERVICE] Twilio Verify check failed for ${e164}: ${data?.message || resp.status}`
        );
        return false;
      }

      return String(data?.status || '').toLowerCase() === 'approved';
    } catch (err: any) {
      console.warn(`[SMS SERVICE] Twilio Verify check failed with network error:`, err?.message);
      return false;
    }
  }

  private static async sendViaTwoFactor(toE164: string, otpCode: string): Promise<SmsDeliveryResult> {
    const apiKey = (process.env.TWOFACTOR_API_KEY || '').trim();
    const template = (process.env.TWOFACTOR_TEMPLATE_NAME || '').trim();
    const cleanPhone = toE164.replace(/\s+/g, '');
    const url = template
      ? `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(cleanPhone)}/${encodeURIComponent(otpCode)}/${encodeURIComponent(template)}`
      : `https://2factor.in/API/V1/${encodeURIComponent(apiKey)}/SMS/${encodeURIComponent(cleanPhone)}/${encodeURIComponent(otpCode)}`;

    const resp = await fetch(url, { method: 'GET' });
    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || String(data?.Status || '').toLowerCase() !== 'success') {
      throw new Error(data?.Details || `2Factor SMS failed with HTTP ${resp.status}`);
    }

    console.log(`[SMS SERVICE] 2Factor SMS OTP sent to ${cleanPhone} (Session: ${data.Details})`);
    return { delivered: true, provider: '2factor', messageId: data.Details };
  }

  private static async sendViaFast2Sms(
    digits10: string,
    otpCode: string,
    messageBody: string
  ): Promise<SmsDeliveryResult> {
    const apiKey = (process.env.FAST2SMS_API_KEY || '').trim();
    const route = (process.env.FAST2SMS_ROUTE || 'otp').trim().toLowerCase();

    const payload: Record<string, any> =
      route === 'q'
        ? {
            route: 'q',
            message: messageBody,
            language: 'english',
            flash: 0,
            numbers: digits10
          }
        : {
            route: 'otp',
            variables_values: otpCode,
            flash: 0,
            numbers: digits10
          };

    const resp = await fetch('https://www.fast2sms.com/dev/bulkV2', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || data?.return === false) {
      throw new Error(
        Array.isArray(data?.message)
          ? data.message.join(', ')
          : data?.message || `Fast2SMS failed with HTTP ${resp.status}`
      );
    }

    console.log(`[SMS SERVICE] Fast2SMS OTP sent to +91${digits10} (Request ID: ${data.request_id})`);
    return { delivered: true, provider: 'fast2sms', messageId: data.request_id };
  }

  private static async sendViaMsg91(toE164: string, otpCode: string): Promise<SmsDeliveryResult> {
    const authKey = (process.env.MSG91_AUTH_KEY || '').trim();
    const templateId = (process.env.MSG91_TEMPLATE_ID || '').trim();
    const mobile = toE164.replace(/^\+/, '');

    const params = new URLSearchParams({
      mobile,
      otp: otpCode
    });
    if (templateId) params.set('template_id', templateId);

    const resp = await fetch(`https://control.msg91.com/api/v5/otp?${params.toString()}`, {
      method: 'POST',
      headers: {
        authkey: authKey,
        'Content-Type': 'application/json'
      }
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || String(data?.type || '').toLowerCase() === 'error') {
      throw new Error(data?.message || `MSG91 SMS failed with HTTP ${resp.status}`);
    }

    console.log(`[SMS SERVICE] MSG91 OTP sent to ${toE164}`);
    return { delivered: true, provider: 'msg91', messageId: data.request_id };
  }

  private static async sendViaTextbelt(toE164: string, body: string): Promise<SmsDeliveryResult> {
    const key = (process.env.TEXTBELT_API_KEY || '').trim();
    const resp = await fetch('https://textbelt.com/text', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: toE164, message: body, key })
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok || !data?.success) {
      throw new Error(data?.error || `Textbelt SMS failed with HTTP ${resp.status}`);
    }

    console.log(`[SMS SERVICE] Textbelt SMS sent to ${toE164} (ID: ${data.textId})`);
    return { delivered: true, provider: 'textbelt', messageId: String(data.textId || '') };
  }

  private static async sendViaWebhook(
    toE164: string,
    otpCode: string,
    body: string,
    purpose: string
  ): Promise<SmsDeliveryResult> {
    const url = (process.env.SMS_WEBHOOK_URL || '').trim();
    const auth = (process.env.SMS_WEBHOOK_AUTH || '').trim();

    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (auth) headers.Authorization = auth;

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ to: toE164, otp: otpCode, message: body, purpose })
    });

    const data: any = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      throw new Error(data?.error || data?.message || `SMS webhook failed with HTTP ${resp.status}`);
    }

    console.log(`[SMS SERVICE] Custom webhook SMS sent to ${toE164}`);
    return { delivered: true, provider: 'webhook', messageId: data?.id || data?.messageId };
  }
}
