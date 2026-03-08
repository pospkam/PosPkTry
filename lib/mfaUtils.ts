// @ts-ignore - speakeasy is an optional dependency, install with: npm install speakeasy
import speakeasy from 'speakeasy';
// @ts-ignore - qrcode is an optional dependency, install with: npm install qrcode
import QRCode from 'qrcode';

export function generateMfaSecret() {
  return speakeasy.generateSecret({ length: 20 });
}

export async function generateQrCode(secret: unknown) {
  // @ts-ignore - speakeasy secret object contains otpauth_url
  return QRCode.toDataURL((secret as { otpauth_url?: string }).otpauth_url!);
}

export function verifyMfaToken(secret: string, token: string) {
  return speakeasy.totp.verify({
    secret,
    encoding: 'base32',
    token,
    window: 1
  });
}
