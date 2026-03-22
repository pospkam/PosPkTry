/**
 * lib/storage/s3.ts
 *
 * Централизованный сервис для работы с S3 (Timeweb Object Storage).
 * Поддерживает upload, getPublicUrl, delete.
 * Если S3 не настроен — fallback на локальную файловую систему (/tmp).
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

// ── Config ───────────────────────────────────────────────────────────────────

const S3_ACCESS_KEY = process.env.S3_ACCESS_KEY || '';
const S3_SECRET_KEY = process.env.S3_SECRET_KEY || '';
const S3_ENDPOINT   = process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru';
const S3_BUCKET     = process.env.S3_BUCKET || '';
const S3_REGION     = process.env.S3_REGION || 'ru-1';

/** S3 настроен и готов к использованию? */
export const isS3Configured = !!(S3_ACCESS_KEY && S3_SECRET_KEY && S3_BUCKET);

// ── Client (lazy singleton) ──────────────────────────────────────────────────

let _client: S3Client | null = null;

function getClient(): S3Client {
  if (!_client) {
    if (!isS3Configured) {
      throw new Error('S3 not configured: S3_ACCESS_KEY, S3_SECRET_KEY, S3_BUCKET required');
    }
    _client = new S3Client({
      region: S3_REGION,
      endpoint: S3_ENDPOINT,
      credentials: {
        accessKeyId: S3_ACCESS_KEY,
        secretAccessKey: S3_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }
  return _client;
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface UploadResult {
  /** Полный публичный URL файла */
  url: string;
  /** Ключ объекта в бакете (для удаления) */
  key: string;
  /** Размер в байтах */
  size: number;
}

// ── Upload ───────────────────────────────────────────────────────────────────

/**
 * Загрузить файл в S3.
 *
 * @param key — путь в бакете (напр. "images/hero/volcano.jpg")
 * @param body — содержимое файла
 * @param contentType — MIME-тип (напр. "image/jpeg")
 * @returns публичный URL и ключ
 */
export async function uploadToS3(
  key: string,
  body: Buffer,
  contentType: string,
): Promise<UploadResult> {
  const client = getClient();

  await client.send(
    new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
      ACL: 'public-read',
      CacheControl: 'public, max-age=31536000, immutable',
    }),
  );

  return {
    url: `${S3_ENDPOINT}/${S3_BUCKET}/${key}`,
    key,
    size: body.length,
  };
}

// ── Delete ───────────────────────────────────────────────────────────────────

/**
 * Удалить объект из S3.
 */
export async function deleteFromS3(key: string): Promise<void> {
  const client = getClient();
  await client.send(
    new DeleteObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
    }),
  );
}

// ── Public URL helper ────────────────────────────────────────────────────────

/**
 * Получить публичный URL для ключа.
 */
export function getS3PublicUrl(key: string): string {
  return `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
}
