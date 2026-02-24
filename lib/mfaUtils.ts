import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export function generateMfaSecret() {
  return speakeasy.generateSecret({ length: 20 });
}

export async function generateQrCode(secret: string) {
  return QRCode.toDataURL(secret.otpauth_url!);
}

export function verifyMfaToken(secret: string, token: string) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });
}
