export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method Not Allowed' });
  }

  res.setHeader('Content-Type', 'application/json');

  try {
    const payload = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const env = process.env;

    const clientId = env.GMAIL_CLIENT_ID;
    const clientSecret = env.GMAIL_CLIENT_SECRET;
    const refreshToken = env.GMAIL_REFRESH_TOKEN;
    const senderEmail = env.GMAIL_USER || 'projectcollinsight@gmail.com';
    const recipientEmail =
      (payload.to && payload.to.trim()) ||
      (env.GMAIL_TO_EMAIL && env.GMAIL_TO_EMAIL.trim()) ||
      'projectcollinsight@gmail.com';

    if (!clientId || !clientSecret || !refreshToken) {
      return res.status(400).json({
        success: false,
        error: 'Gmail OAuth credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) are missing in environment variables.',
      });
    }

    // 1. Refresh Access Token from Google OAuth 2.0
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    const tokenData = (await tokenRes.json()) as any;
    if (!tokenRes.ok || !tokenData.access_token) {
      return res.status(500).json({
        success: false,
        error: `Google OAuth Token Refresh Failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`,
      });
    }

    const accessToken = tokenData.access_token;

    // 2. Build MIME Multi-part Message with HTML & Attachments
    const boundary = `----=_Part_COLLINSIGHT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const subject = payload.subject || 'COLLinSight Official Clearance Dispatch';
    const subjectEncoded = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
    const attachments = payload.attachments || [];

    const mimeParts: string[] = [
      `To: ${recipientEmail}`,
      `From: "COLLinSight Directorate" <${senderEmail}>`,
      `Reply-To: ${senderEmail}`,
      `Subject: ${subjectEncoded}`,
      'MIME-Version: 1.0',
      attachments.length > 0
        ? `Content-Type: multipart/mixed; boundary="${boundary}"`
        : 'Content-Type: text/html; charset="UTF-8"',
      '',
    ];

    if (attachments.length > 0) {
      // HTML Part
      mimeParts.push(`--${boundary}`);
      mimeParts.push('Content-Type: text/html; charset="UTF-8"');
      mimeParts.push('Content-Transfer-Encoding: 8bit');
      mimeParts.push('');
      mimeParts.push(payload.html || '<p>COLLinSight clearance documents attached.</p>');
      mimeParts.push('');

      // Attachments Part
      for (const file of attachments) {
        mimeParts.push(`--${boundary}`);
        mimeParts.push(`Content-Type: ${file.contentType || 'application/pdf'}; name="${file.filename}"`);
        mimeParts.push('Content-Transfer-Encoding: base64');
        mimeParts.push(`Content-Disposition: attachment; filename="${file.filename}"`);
        mimeParts.push('');
        // Wrap base64 at 76 characters for strict RFC standard compliance
        const base64Data = (file.contentBase64 || '').replace(/\r?\n|\r/g, '');
        const wrapped = base64Data.match(/.{1,76}/g)?.join('\r\n') || base64Data;
        mimeParts.push(wrapped);
        mimeParts.push('');
      }
      mimeParts.push(`--${boundary}--`);
    } else {
      mimeParts.push(payload.html || '<p>COLLinSight clearance documents attached.</p>');
    }

    const rawMime = mimeParts.join('\r\n');

    // 3. Encode into RFC 4648 Base64URL string
    const base64UrlRaw = Buffer.from(rawMime)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    // 4. Dispatch via Gmail API
    const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ raw: base64UrlRaw }),
    });

    const sendData = (await sendRes.json()) as any;
    if (!sendRes.ok) {
      return res.status(500).json({
        success: false,
        error: `Gmail API Send Failed: ${sendData.error?.message || JSON.stringify(sendData)}`,
      });
    }

    return res.status(200).json({
      success: true,
      messageId: sendData.id,
      threadId: sendData.threadId,
      to: recipientEmail,
      attachmentsCount: attachments.length,
    });
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Internal Server Error during email dispatch.',
    });
  }
}
