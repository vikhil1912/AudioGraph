import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

import config

def send_meeting_minutes_email(to_email: str, meeting_id: str, html_content: str) -> bool:
    """
    Sends the generated meeting minutes via Gmail SMTP.
    Requires GMAIL_USER and GMAIL_APP_PASSWORD in config.
    """
    gmail_user = getattr(config, "GMAIL_USER", None)
    gmail_app_password = getattr(config, "GMAIL_APP_PASSWORD", None)
    
    if not gmail_user or not gmail_app_password:
        print("[Email Service] Warning: GMAIL_USER or GMAIL_APP_PASSWORD not configured. Skipping email.")
        return False
        
    msg = MIMEMultipart()
    msg['From'] = gmail_user
    msg['To'] = to_email
    msg['Subject'] = f"Meeting Minutes: {meeting_id}"
    
    # Attach the HTML content
    msg.attach(MIMEText(html_content, 'html'))
    
    try:
        print(f"[Email Service] Sending email to {to_email}...")
        server = smtplib.SMTP_SSL('smtp.gmail.com', 465)
        server.ehlo()
        server.login(gmail_user, gmail_app_password)
        server.sendmail(gmail_user, to_email, msg.as_string())
        server.close()
        print("[Email Service] Email sent successfully!")
        return True
    except Exception as e:
        print(f"[Email Service] Failed to send email: {e}")
        return False
