import os
import smtplib
from email.message import EmailMessage


def send_email(to: str, subject: str, body: str) -> bool:
    host = os.getenv("SMTP_HOST")
    if not host:
        print(f"[email-dev] to={to} subject={subject}\n{body}")
        return False

    port = int(os.getenv("SMTP_PORT", "587"))
    username = os.getenv("SMTP_USERNAME")
    password = os.getenv("SMTP_PASSWORD")
    from_address = os.getenv("SMTP_FROM", username or "no-reply@aitinerary.local")

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = from_address
    message["To"] = to
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=15) as server:
        if os.getenv("SMTP_USE_TLS", "true").lower() != "false":
            server.starttls()
        if username:
            server.login(username, password)
        server.send_message(message)
    return True