import { defineConfig, Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { fileURLToPath, URL } from 'node:url'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Loads environment variables from .env file into a simple dictionary
 */
function loadLocalEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  const envPath = path.resolve(process.cwd(), '.env')
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const [key, ...values] = trimmed.split('=')
      if (key && values.length) {
        env[key.trim()] = values.join('=').trim()
      }
    }
  }
  return env
}

/**
 * Custom Vite Plugin to handle /api/send-clearance-email for Gmail OAuth 2.0 API dispatch
 */
function gmailMailerPlugin(): Plugin {
  return {
    name: 'gmail-mailer-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (req.url === '/api/send-clearance-email' && req.method === 'POST') {
          let body = ''
          req.on('data', (chunk) => {
            body += chunk
          })

          req.on('end', async () => {
            res.setHeader('Content-Type', 'application/json')
            try {
              const payload = JSON.parse(body || '{}')
              const env = { ...loadLocalEnv(), ...process.env }

              const clientId = env.GMAIL_CLIENT_ID
              const clientSecret = env.GMAIL_CLIENT_SECRET
              const refreshToken = env.GMAIL_REFRESH_TOKEN
              const senderEmail = env.GMAIL_USER || 'projectcollinsight@gmail.com'
              const recipientEmail =
                (payload.to && payload.to.trim()) ||
                (env.GMAIL_TO_EMAIL && env.GMAIL_TO_EMAIL.trim()) ||
                'projectcollinsight@gmail.com'

              if (!clientId || !clientSecret || !refreshToken) {
                res.statusCode = 400
                res.end(
                  JSON.stringify({
                    success: false,
                    error: 'Gmail OAuth credentials (GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN) are missing in .env.',
                  })
                )
                return
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
              })

              const tokenData = (await tokenRes.json()) as any
              if (!tokenRes.ok || !tokenData.access_token) {
                res.statusCode = 500
                res.end(
                  JSON.stringify({
                    success: false,
                    error: `Google OAuth Token Refresh Failed: ${tokenData.error_description || tokenData.error || 'Unknown error'}`,
                  })
                )
                return
              }

              const accessToken = tokenData.access_token

              // 2. Build MIME Multi-part Message with HTML & Attachments
              const boundary = `----=_Part_COLLINSIGHT_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`
              const subject = payload.subject || 'COLLinSight Official Clearance Dispatch'
              const subjectEncoded = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`
              const attachments = payload.attachments || []

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
              ]

              if (attachments.length > 0) {
                // HTML Part
                mimeParts.push(`--${boundary}`)
                mimeParts.push('Content-Type: text/html; charset="UTF-8"')
                mimeParts.push('Content-Transfer-Encoding: 8bit')
                mimeParts.push('')
                mimeParts.push(payload.html || '<p>COLLinSight clearance documents attached.</p>')
                mimeParts.push('')

                // Attachments Part
                for (const file of attachments) {
                  mimeParts.push(`--${boundary}`)
                  mimeParts.push(`Content-Type: ${file.contentType || 'application/pdf'}; name="${file.filename}"`)
                  mimeParts.push('Content-Transfer-Encoding: base64')
                  mimeParts.push(`Content-Disposition: attachment; filename="${file.filename}"`)
                  mimeParts.push('')
                  // Wrap base64 at 76 characters for strict RFC standard compliance
                  const base64Data = (file.contentBase64 || '').replace(/\r?\n|\r/g, '')
                  const wrapped = base64Data.match(/.{1,76}/g)?.join('\r\n') || base64Data
                  mimeParts.push(wrapped)
                  mimeParts.push('')
                }
                mimeParts.push(`--${boundary}--`)
              } else {
                mimeParts.push(payload.html || '<p>COLLinSight clearance documents attached.</p>')
              }

              const rawMime = mimeParts.join('\r\n')

              // 3. Encode into RFC 4648 Base64URL string
              const base64UrlRaw = Buffer.from(rawMime)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '')

              // 4. Dispatch via Gmail API
              const sendRes = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${accessToken}`,
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({ raw: base64UrlRaw }),
              })

              const sendData = (await sendRes.json()) as any
              if (!sendRes.ok) {
                res.statusCode = 500
                res.end(
                  JSON.stringify({
                    success: false,
                    error: `Gmail API Send Failed: ${sendData.error?.message || JSON.stringify(sendData)}`,
                  })
                )
                return
              }

              res.statusCode = 200
              res.end(
                JSON.stringify({
                  success: true,
                  messageId: sendData.id,
                  threadId: sendData.threadId,
                  to: recipientEmail,
                  attachmentsCount: attachments.length,
                })
              )
            } catch (err: any) {
              res.statusCode = 500
              res.end(
                JSON.stringify({
                  success: false,
                  error: err.message || 'Internal Server Error during email dispatch.',
                })
              )
            }
          })
          return
        }
        next()
      })
    },
  }
}

// Vite config — https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    gmailMailerPlugin(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '8443'),
  },
})
