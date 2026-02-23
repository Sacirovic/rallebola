<?php

declare(strict_types=1);

namespace App;

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;

class Mailer
{
    public static function sendBorrowRequestNotification(
        string $ownerEmail,
        string $ownerName,
        string $requesterName,
        string $itemName,
        string $listName,
        ?string $message
    ): void {
        $host = $_ENV['MAIL_HOST'] ?? getenv('MAIL_HOST');
        if (!$host) {
            // Email not configured — skip silently
            return;
        }

        $mail = new PHPMailer(true);

        try {
            $mail->isSMTP();
            $mail->Host       = $host;
            $mail->Port       = (int) ($_ENV['MAIL_PORT'] ?? getenv('MAIL_PORT') ?: 587);
            $mail->Username   = $_ENV['MAIL_USERNAME'] ?? getenv('MAIL_USERNAME');
            $mail->Password   = $_ENV['MAIL_PASSWORD'] ?? getenv('MAIL_PASSWORD');
            $mail->SMTPAuth   = !empty($mail->Username);
            $mail->SMTPSecure = $mail->Port === 465 ? PHPMailer::ENCRYPTION_SMTPS : PHPMailer::ENCRYPTION_STARTTLS;

            $fromAddress = $_ENV['MAIL_FROM_ADDRESS'] ?? getenv('MAIL_FROM_ADDRESS') ?: $mail->Username;
            $fromName    = $_ENV['MAIL_FROM_NAME'] ?? getenv('MAIL_FROM_NAME') ?: 'Rallebola';

            $mail->setFrom($fromAddress, $fromName);
            $mail->addAddress($ownerEmail, $ownerName);

            $mail->isHTML(true);
            $mail->CharSet = PHPMailer::CHARSET_UTF8;
            $mail->Subject = "{$requesterName} wants to borrow "{$itemName}"";

            $messageHtml = $message
                ? '<p style="margin:16px 0"><em>"' . htmlspecialchars($message) . '"</em></p>'
                : '';

            $mail->Body = '
<!DOCTYPE html>
<html>
<body style="font-family:Georgia,serif;background:#F7F2E8;padding:32px">
  <div style="max-width:480px;margin:0 auto;background:#FDFCF8;border:1.5px solid #DDD0B0;border-radius:12px;overflow:hidden">
    <div style="background:#5C7A48;padding:20px 28px;border-bottom:3px solid #D4A84A">
      <h1 style="margin:0;font-size:20px;color:#F5E4B0">🌲 Rallebola</h1>
    </div>
    <div style="padding:28px">
      <h2 style="margin:0 0 12px;color:#3C2A18;font-size:18px">New Borrow Request</h2>
      <p style="color:#6E4E30;margin:0 0 8px">
        <strong>' . htmlspecialchars($requesterName) . '</strong> wants to borrow
        <strong>' . htmlspecialchars($itemName) . '</strong>
        from your list <strong>' . htmlspecialchars($listName) . '</strong>.
      </p>
      ' . $messageHtml . '
      <p style="color:#A08060;font-size:13px;margin-top:24px">
        Log in to Rallebola to approve or reject this request.
      </p>
    </div>
  </div>
</body>
</html>';

            $mail->AltBody = "{$requesterName} wants to borrow "{$itemName}" from your list "{$listName}"."
                . ($message ? "\n\nMessage: {$message}" : '')
                . "\n\nLog in to Rallebola to approve or reject this request.";

            $mail->send();
        } catch (\Exception $e) {
            // Log but do not bubble — a failed email must not block the request
            error_log('Mailer error: ' . $mail->ErrorInfo);
        }
    }
}
