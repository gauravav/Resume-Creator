# Email Service Configuration Guide

This application supports **three email providers**: SendGrid, Gmail SMTP, and Mailjet. You can easily switch between them by changing the `EMAIL_SERVICE` environment variable.

## Quick Start

To switch email providers, update the `.env` file:

```env
# Change this to: "sendgrid", "gmail", or "mailjet"
EMAIL_SERVICE=mailjet
```

## Supported Email Providers

### 1. Mailjet (Recommended for Production)

**Pros:**
- Reliable API with good deliverability
- Generous free tier (200 emails/day, 6,000 emails/month)
- Easy to set up and configure
- Built-in email templates and analytics
- Good documentation and support

**Setup Instructions:**

1. **Create a Mailjet Account**
   - Visit: https://app.mailjet.com/signup
   - Sign up for a free account

2. **Get API Credentials**
   - Go to: https://app.mailjet.com/account/apikeys
   - Copy your **API Key** and **Secret Key**

3. **Verify Sender Email**
   - Go to: https://app.mailjet.com/account/sender
   - Add and verify your sender email address
   - Check your email for the verification link

4. **Configure `.env` File**
   ```env
   EMAIL_SERVICE=mailjet

   # Mailjet Configuration
   MAILJET_API_KEY=your_actual_api_key_here
   MAILJET_SECRET_KEY=your_actual_secret_key_here
   MAILJET_FROM_EMAIL=your_verified_email@domain.com
   MAILJET_FROM_NAME=Resume Builder
   ```

5. **Restart the Server**
   ```bash
   cd Backend
   npm run dev
   ```

**Free Tier Limits:**
- 200 emails per day
- 6,000 emails per month
- No credit card required

---

### 2. SendGrid

**Pros:**
- Industry-standard email service
- Excellent deliverability rates
- Advanced features (templates, analytics, webhooks)
- Free tier: 100 emails/day

**Setup Instructions:**

1. **Create SendGrid Account**
   - Visit: https://signup.sendgrid.com/
   - Sign up for a free account

2. **Get API Key**
   - Go to Settings → API Keys
   - Create a new API key with "Mail Send" permissions
   - Copy the API key (shown only once!)

3. **Verify Sender Email**
   - Go to Settings → Sender Authentication
   - Verify your sender email address

4. **Configure `.env` File**
   ```env
   EMAIL_SERVICE=sendgrid

   # SendGrid Configuration
   SENDGRID_API_KEY=SG.your_actual_api_key_here
   SENDGRID_FROM_EMAIL=your_verified_email@domain.com
   SENDGRID_FROM_NAME=Resume Builder
   ```

**Free Tier Limits:**
- 100 emails per day
- No credit card required for first 30 days

---

### 3. Gmail SMTP

**Pros:**
- Free for personal use
- No daily limits for personal accounts
- Easy to set up with existing Gmail account
- Good for development and testing

**Cons:**
- Less reliable for production
- May be flagged as spam
- Requires app password setup

**Setup Instructions:**

1. **Enable 2-Factor Authentication**
   - Go to: https://myaccount.google.com/security
   - Enable 2-Step Verification (required for app passwords)

2. **Create App Password**
   - Go to: https://myaccount.google.com/apppasswords
   - Select "Mail" and your device
   - Generate app password
   - Copy the 16-character password (spaces don't matter)

3. **Configure `.env` File**
   ```env
   EMAIL_SERVICE=gmail

   # Gmail SMTP Configuration
   GMAIL_USER=your.email@gmail.com
   GMAIL_APP_PASSWORD=your 16 char app password
   GMAIL_FROM_NAME=Resume Builder
   ```

**Limits:**
- 500 emails per day for personal accounts
- 2000 emails per day for Google Workspace accounts

---

## Email Types Sent by the Application

The application sends the following automated emails:

1. **Verification Email** - Sent when a user registers
2. **Admin Notification** - Sent when a user verifies their email
3. **Approval Email** - Sent when admin approves a user
4. **Rejection Email** - Sent when admin rejects a user
5. **Server Startup Success** - Sent to admin when server starts
6. **Server Startup Failure** - Sent to admin if server fails to start

---

## Testing Your Email Configuration

### Method 1: Start the Server

When you start the server, it automatically sends a test email to the admin:

```bash
cd Backend
npm run dev
```

Check your admin email inbox for the "Server Started Successfully" email.

### Method 2: Register a New User

1. Start the frontend: `cd Frontend && npm run dev`
2. Navigate to http://localhost:3000/register
3. Register a new user with a test email
4. Check the email inbox for the verification email

---

## Troubleshooting

### Mailjet

**Error: "Invalid API credentials"**
- Double-check `MAILJET_API_KEY` and `MAILJET_SECRET_KEY` in `.env`
- Make sure there are no extra spaces or quotes
- Verify credentials at https://app.mailjet.com/account/apikeys

**Error: "Sender email not verified"**
- Go to https://app.mailjet.com/account/sender
- Verify your sender email address
- Update `MAILJET_FROM_EMAIL` to match the verified email

**Rate limit errors:**
- Free tier: 200 emails/day, 6,000/month
- Upgrade your Mailjet plan if you need more

### SendGrid

**Error: "Invalid API key"**
- Check `SENDGRID_API_KEY` in `.env`
- API keys start with "SG."
- Create a new API key if needed

**Error: "Sender email not verified"**
- Verify your sender email in SendGrid dashboard
- It can take a few minutes for verification to complete

### Gmail SMTP

**Error: "Invalid credentials"**
- Make sure 2FA is enabled on your Google account
- Use an **app password**, not your regular password
- App password should be 16 characters (spaces don't matter)

**Error: "Authentication failed"**
- Regenerate a new app password
- Make sure `GMAIL_USER` is the full email address

---

## Switching Between Providers

You can easily switch between email providers without restarting the application:

1. Update `EMAIL_SERVICE` in `.env`:
   ```env
   EMAIL_SERVICE=mailjet  # or "sendgrid" or "gmail"
   ```

2. Make sure the corresponding credentials are configured

3. Restart the server:
   ```bash
   cd Backend
   npm run dev
   ```

The server will automatically:
- Validate the configuration
- Test the connection
- Send a startup notification email

---

## Recommendations

### For Development
- Use **Gmail SMTP** (easiest to set up, free)

### For Production
- Use **Mailjet** or **SendGrid** (better deliverability, professional features)
- Set up domain authentication for best deliverability
- Monitor your email sending limits

### For High Volume
- Use **SendGrid** with a paid plan
- Mailjet also offers paid plans with higher limits

---

## Security Best Practices

1. **Never commit `.env` file to git**
   - Already in `.gitignore`
   - Keep API keys secret

2. **Use environment-specific configurations**
   - Different credentials for development/production
   - Separate API keys for testing

3. **Rotate API keys regularly**
   - Change keys every 90 days
   - Immediately rotate if compromised

4. **Monitor email usage**
   - Check provider dashboards regularly
   - Set up alerts for unusual activity

---

## Need Help?

- **Mailjet Docs**: https://dev.mailjet.com/
- **SendGrid Docs**: https://docs.sendgrid.com/
- **Gmail SMTP**: https://support.google.com/mail/answer/7126229

For application-specific issues, check the server logs:
```bash
cd Backend
npm run dev
```

Look for email service initialization messages and error details.
