import logging
from django.conf import settings
from django.core.mail import EmailMultiAlternatives

logger = logging.getLogger(__name__)


def send_admin_reset_email(recipient_email, reset_key, admin_username="Admin", expires_minutes=15):
    """
    Dispatches a password recovery email containing the 6-digit reset key
    to the administrator via Django's configured SMTP backend (Gmail).
    """
    if not recipient_email:
        return False, "Recipient email address is missing."

    sender_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'Farm Suit Security <gurukalyan786@gmail.com>')
    subject = f"Farm Suit Admin Password Reset Code: {reset_key}"

    # Plain text version
    text_content = f"""Hello {admin_username},

A request was received to reset the administrator password for your Farm Suit account.

Your 6-digit password reset key is: {reset_key}

This key will expire in {expires_minutes} minutes.
Enter this key on the Farm Suit login recovery screen to reset your password.

If you did not make this request, please contact the Farm Suit developer team immediately at gurukalyan786@gmail.com.

Best regards,
Farm Suit Security System
"""

    # Responsive HTML version
    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Farm Suit Password Reset</title>
  <style>
    body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0b1120; margin: 0; padding: 24px; color: #e2e8f0; }}
    .container {{ max-width: 520px; margin: 0 auto; background-color: #111827; border: 1px solid #1f2937; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }}
    .header {{ background: linear-gradient(135deg, #059669 0%, #10b981 100%); padding: 28px 24px; text-align: center; color: #ffffff; }}
    .header h1 {{ margin: 0; font-size: 22px; font-weight: 700; letter-spacing: 0.5px; }}
    .header p {{ margin: 6px 0 0; font-size: 13px; opacity: 0.9; }}
    .body {{ padding: 32px 28px; }}
    .greeting {{ font-size: 15px; margin-bottom: 16px; color: #f1f5f9; }}
    .instruction {{ font-size: 14px; line-height: 1.6; color: #94a3b8; margin-bottom: 24px; }}
    .key-box {{ background-color: #1e293b; border: 2px dashed #10b981; border-radius: 8px; padding: 20px; text-align: center; margin: 24px 0; }}
    .key-label {{ font-size: 11px; text-transform: uppercase; letter-spacing: 1.5px; color: #10b981; font-weight: 700; margin-bottom: 6px; }}
    .key-code {{ font-family: 'Courier New', Courier, monospace; font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #34d399; user-select: all; }}
    .notice {{ background-color: #182234; border-left: 4px solid #f59e0b; padding: 12px 14px; border-radius: 4px; font-size: 12.5px; color: #cbd5e1; margin-top: 20px; line-height: 1.5; }}
    .footer {{ border-top: 1px solid #1f2937; padding: 20px 24px; text-align: center; font-size: 11.5px; color: #64748b; background-color: #0f172a; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌱 FARM SUIT</h1>
      <p>Farm Business Management Platform</p>
    </div>
    <div class="body">
      <div class="greeting">Hello <strong>{admin_username}</strong>,</div>
      <div class="instruction">
        We received a request to reset the administrator password for your Farm Suit account. Use the one-time verification key below to complete the reset process:
      </div>
      <div class="key-box">
        <div class="key-label">Administrator Reset Key</div>
        <div class="key-code">{reset_key}</div>
      </div>
      <div class="notice">
        ⏳ <strong>Valid for {expires_minutes} minutes only.</strong><br>
        If you did not request this password reset, please ignore this email or review your administrator account security immediately.
      </div>
    </div>
    <div class="footer">
      This is an automated security transmission sent from <strong>gurukalyan786@gmail.com</strong>.<br>
      &copy; 2026 Farm Suit Unified Platform. All rights reserved.
    </div>
  </div>
</body>
</html>
"""

    try:
        msg = EmailMultiAlternatives(
            subject=subject,
            body=text_content,
            from_email=sender_email,
            to=[recipient_email]
        )
        msg.attach_alternative(html_content, "text/html")
        msg.send(fail_silently=False)
        logger.info(f"Admin reset email successfully sent to {recipient_email} from {sender_email}")
        return True, None
    except Exception as exc:
        err_msg = str(exc)
        logger.error(f"Failed to dispatch password reset email to {recipient_email}: {err_msg}")
        return False, err_msg

