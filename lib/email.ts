/**
 * lib/email.ts
 * Отправка email через SMTP (Timeweb Mail).
 */

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail(opts: EmailOptions): Promise<{ success: boolean; error?: string }> {
  const host = process.env.SMTP_HOST;
  const port = parseInt(process.env.SMTP_PORT || '587');
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const from = process.env.SMTP_FROM || 'noreply@tourhab.ru';

  if (!host || !user || !pass) {
    return { success: false, error: 'SMTP не настроен' };
  }

  // Формируем MIME-сообщение вручную (без nodemailer, чтобы не тянуть зависимость)
  const boundary = `----=_Part_${Date.now()}`;
  const body = [
    `From: ${from}`,
    `To: ${opts.to}`,
    `Subject: ${opts.subject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: quoted-printable`,
    ``,
    opts.text,
    ``,
  ];

  if (opts.html) {
    body.push(
      `--${boundary}`,
      `Content-Type: text/html; charset=UTF-8`,
      `Content-Transfer-Encoding: quoted-printable`,
      ``,
      opts.html,
      ``,
    );
  }

  body.push(`--${boundary}--`);

  const message = body.join('\r\n');

  // SMTP через raw TCP — используем node:net
  // Для production лучше добавить nodemailer, но для MVP хватит
  try {
    const { Socket } = await import('net');
    const socket = new Socket();
    const state: Record<string, boolean> = {};

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        socket.destroy();
        resolve({ success: false, error: 'SMTP timeout' });
      }, 10000);

      socket.connect(port, host, () => {
        // Ждём приветствие сервера
      });

      let buffer = '';

      socket.on('data', (data: Buffer) => {
        buffer += data.toString();
        const lines = buffer.split('\r\n');
        buffer = lines.pop() || '';

        const lastLine = lines[lines.length - 1] || '';
        const code = parseInt(lastLine.slice(0, 3));

        if (code === 220 && !state['_ehlo_sent']) {
          state['_ehlo_sent'] = true;
          socket.write('EHLO tourhab.ru\r\n');
        } else if (code === 250 && !state['_auth_sent']) {
          state['_auth_sent'] = true;
          socket.write('AUTH LOGIN\r\n');
        } else if (code === 334 && !state['_user_sent']) {
          state['_user_sent'] = true;
          socket.write(Buffer.from(user).toString('base64') + '\r\n');
        } else if (code === 334 && !state['_pass_sent']) {
          state['_pass_sent'] = true;
          socket.write(Buffer.from(pass).toString('base64') + '\r\n');
        } else if (code === 235 && !state['_mail_sent']) {
          state['_mail_sent'] = true;
          socket.write(`MAIL FROM:<${from}>\r\n`);
        } else if (code === 250 && !state['_rcpt_sent']) {
          state['_rcpt_sent'] = true;
          socket.write(`RCPT TO:<${opts.to}>\r\n`);
        } else if (code === 250 && !state['_data_sent']) {
          state['_data_sent'] = true;
          socket.write('DATA\r\n');
        } else if (code === 354 && !state['_body_sent']) {
          state['_body_sent'] = true;
          socket.write(message + '\r\n.\r\n');
        } else if (code === 250 && state['_body_sent']) {
          clearTimeout(timeout);
          socket.write('QUIT\r\n');
          socket.destroy();
          resolve({ success: true });
        } else if (code >= 400) {
          clearTimeout(timeout);
          socket.destroy();
          resolve({ success: false, error: `SMTP error: ${lastLine}` });
        }
      });

      socket.on('error', (err) => {
        clearTimeout(timeout);
        resolve({ success: false, error: err.message });
      });
    });
  } catch {
    return { success: false, error: 'SMTP connection failed' };
  }
}
