import { NextRequest, NextResponse } from 'next/server'
import { config } from '@/lib/config'
import { requireAdmin } from '@/lib/auth/middleware'
import { convertUrlToMarkdown } from '@/lib/ai/markdown-new'
import fs from 'fs'
import path from 'path'
import { S3Client, PutObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'

// Для Timeweb Cloud Apps можно использовать nodejs runtime
export const runtime = 'nodejs'

interface KnowledgeDocument {
  id: string
  title: string
  content: string
  category: string
  lastUpdated: string
  source: string
  url?: string
}

function parseSourceUrls(rawValue: string | undefined): string[] {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(',')
    .map(item => item.trim())
    .filter(Boolean);
}

async function collectExternalUrlDocuments(urls: string[]): Promise<KnowledgeDocument[]> {
  const documents: KnowledgeDocument[] = [];

  for (const sourceUrl of urls) {
    try {
      const markdown = await convertUrlToMarkdown(sourceUrl, { method: 'auto', retainImages: false });
      documents.push({
        id: `external_${Buffer.from(sourceUrl).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24)}`,
        title: `External URL: ${sourceUrl}`,
        content: markdown,
        category: 'external_sources',
        lastUpdated: new Date().toISOString(),
        source: sourceUrl,
        url: sourceUrl,
      });
    } catch (error) {
      console.error(`Ошибка конвертации URL через markdown.new (${sourceUrl}):`, error);
    }
  }

  return documents;
}

// Настройка S3 клиента для Timeweb Cloud
const s3AccessKey = process.env.S3_ACCESS_KEY
const s3SecretKey = process.env.S3_SECRET_KEY
const s3Endpoint = config.files.s3Endpoint || process.env.S3_ENDPOINT || 'https://s3.twcstorage.ru'
const s3Bucket = config.files.s3Bucket || process.env.S3_BUCKET

const s3Client = s3AccessKey && s3SecretKey
  ? new S3Client({
      region: config.files.s3Region || process.env.S3_REGION || 'ru-1',
      endpoint: s3Endpoint,
      credentials: {
        accessKeyId: s3AccessKey,
        secretAccessKey: s3SecretKey,
      },
      forcePathStyle: true,
    })
  : null

// Получить все документы для базы знаний
async function collectProjectDocuments(): Promise<KnowledgeDocument[]> {
  const documents: KnowledgeDocument[] = []

  // Основные документы проекта
  const docPaths = [
    'README.md',
    'docs/AI_ASSISTANTS_GUIDE.md',
    'docs/ROLES_IMPLEMENTATION_PLAN.md',
    'docs/DEPLOYMENT_READY.md',
    'ЧЕСТНАЯ_ПРОВЕРКА_ЗАГЛУШЕК.md',
    'ФИНАЛЬНЫЙ_ОТЧЁТ_ДОРАБОТКИ_ДО_100.md',
  ]

  for (const docPath of docPaths) {
    try {
      const fullPath = path.join(process.cwd(), docPath)
      if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf-8')
        const title = path.basename(docPath, path.extname(docPath))

        documents.push({
          id: `doc_${title.toLowerCase().replace(/\s+/g, '_')}`,
          title: title.replace(/_/g, ' '),
          content: content,
          category: 'documentation',
          lastUpdated: new Date().toISOString(),
          source: docPath,
        })
      }
    } catch (error) {
      console.error(`Ошибка чтения ${docPath}:`, error)
    }
  }

  // Добавить информацию о турах и услугах из базы данных
  try {
    const { query } = await import('@/lib/database')

    // Информация о турах
    const tours = await query(`
      SELECT
        id,
        name,
        description,
        price,
        duration,
        difficulty,
        location,
        category
      FROM tours
      LIMIT 50
    `)

    tours.rows.forEach((tour: any) => {
      documents.push({
        id: `tour_${tour.id}`,
        title: `Тур: ${tour.name}`,
        content: `
Название: ${tour.name}
Описание: ${tour.description || 'Нет описания'}
Цена: ${tour.price} ₽
Длительность: ${tour.duration} дней
Сложность: ${tour.difficulty || 'Не указана'}
Местоположение: ${tour.location || 'Камчатка'}
Категория: ${tour.category || 'Экскурсионный'}
        `,
        category: 'tours',
        lastUpdated: new Date().toISOString(),
        source: 'database_tours',
      })
    })

    // Информация о партнерах/операторах
    const operators = await query(`
      SELECT
        id,
        name,
        description,
        contact_info,
        specialization,
        rating
      FROM partners
      WHERE role = 'operator'
      LIMIT 20
    `)

    operators.rows.forEach((operator: any) => {
      documents.push({
        id: `operator_${operator.id}`,
        title: `Оператор: ${operator.name}`,
        content: `
Название: ${operator.name}
Описание: ${operator.description || 'Нет описания'}
Специализация: ${operator.specialization || 'Туры'}
Контакты: ${operator.contact_info || 'Не указаны'}
Рейтинг: ${operator.rating || 'Не оценен'}
        `,
        category: 'operators',
        lastUpdated: new Date().toISOString(),
        source: 'database_operators',
      })
    })

  } catch (error) {
    console.error('Ошибка получения данных из БД:', error)
  }

  const externalUrls = parseSourceUrls(process.env.KNOWLEDGE_BASE_SOURCE_URLS)
  if (externalUrls.length > 0) {
    const externalDocuments = await collectExternalUrlDocuments(externalUrls)
    documents.push(...externalDocuments)
  }

  return documents
}

// Загрузить файл в S3 хранилище
async function uploadToS3(file: File, fileName: string): Promise<string> {
  try {
    if (!s3Client || !s3Bucket) {
      throw new Error('S3 credentials or bucket are not configured')
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    const command = new PutObjectCommand({
      Bucket: s3Bucket,
      Key: `knowledge-base/${fileName}`,
      Body: buffer,
      ContentType: file.type,
      ACL: 'public-read',
    })

    await s3Client.send(command)

    const fileUrl = `${s3Endpoint}/${s3Bucket}/knowledge-base/${fileName}`
    return fileUrl
  } catch (error) {
    console.error('Ошибка загрузки в S3:', error)
    throw error
  }
}

// Обновить базу знаний Timeweb AI
async function updateKnowledgeBase(documents: KnowledgeDocument[]): Promise<boolean> {
  const { timeweb } = config.ai

  if (!timeweb.knowledgeBase.enabled) {
    return false
  }

  try {
    // Разбиваем документы на чанки для отправки
    const chunks = []
    const chunkSize = timeweb.knowledgeBase.chunkSize

    for (let i = 0; i < documents.length; i += chunkSize) {
      chunks.push(documents.slice(i, i + chunkSize))
    }


    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i]

      const response = await fetch(timeweb.knowledgeBase.updateEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.TIMEWEB_API_TOKEN}`,
        },
        body: JSON.stringify({
          agentId: timeweb.primaryAgent.id,
          documents: chunk,
          chunkIndex: i,
          totalChunks: chunks.length,
        }),
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error(`Ошибка отправки чанка ${i + 1}/${chunks.length}:`, errorText)
        return false
      }

      const result = await response.json()

      // Небольшая задержка между запросами
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    return true
  } catch (error) {
    console.error('Ошибка обновления базы знаний:', error)
    return false
  }
}

// GET - Получить статус базы знаний
// AUTH: requireAdmin — чувствительное управление KB и внешние интеграции
export async function GET(request: NextRequest) {
  const adminOrResponse = await requireAdmin(request);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

  try {
    const { timeweb } = config.ai

    const status = {
      agentId: timeweb.primaryAgent.id,
      agentName: timeweb.primaryAgent.name,
      knowledgeBaseEnabled: timeweb.knowledgeBase.enabled,
      maxDocuments: timeweb.knowledgeBase.maxDocuments,
      chunkSize: timeweb.knowledgeBase.chunkSize,
      s3Bucket: config.files.s3Bucket,
      s3Endpoint: config.files.s3Endpoint,
      lastUpdate: null, // TODO: хранить в БД
      documentCount: 0, // TODO: получить из БД
    }

    return NextResponse.json({
      success: true,
      data: status
    })

  } catch (error) {
    console.error('Ошибка получения статуса базы знаний:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to get knowledge base status'
    }, { status: 500 })
  }
}

// POST - Обновить базу знаний
// AUTH: requireAdmin — чувствительное управление KB и внешние интеграции
export async function POST(request: NextRequest) {
  const adminOrResponse = await requireAdmin(request);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

  try {

    const formData = await request.formData()
    const updateType = formData.get('type') as string || 'auto'

    let documents: KnowledgeDocument[] = []

    if (updateType === 'file' && formData.has('file')) {
      // Загрузка файла
      const file = formData.get('file') as File
      if (!file) {
        return NextResponse.json({
          success: false,
          error: 'No file provided'
        }, { status: 400 })
      }


      // Загружаем файл в S3
      const fileName = `${Date.now()}_${file.name}`
      const fileUrl = await uploadToS3(file, fileName)

      // Читаем содержимое файла
      const content = await file.text()

      documents.push({
        id: `file_${Date.now()}`,
        title: file.name,
        content: content,
        category: 'uploaded_files',
        lastUpdated: new Date().toISOString(),
        source: fileUrl,
        url: fileUrl,
      })

    } else if (updateType === 'url') {
      const sourceUrl = (formData.get('url') as string | null)?.trim()

      if (!sourceUrl) {
        return NextResponse.json({
          success: false,
          error: 'URL is required for type=url'
        }, { status: 400 })
      }

      const markdown = await convertUrlToMarkdown(sourceUrl, { method: 'auto', retainImages: false })
      documents.push({
        id: `url_${Date.now()}`,
        title: `URL: ${sourceUrl}`,
        content: markdown,
        category: 'external_sources',
        lastUpdated: new Date().toISOString(),
        source: sourceUrl,
        url: sourceUrl,
      })
    } else {
      // Автоматическое обновление из проекта
      documents = await collectProjectDocuments()
    }


    // Ограничиваем количество документов
    const maxDocs = config.ai.timeweb.knowledgeBase.maxDocuments
    const limitedDocuments = documents.slice(0, maxDocs)

    if (documents.length > maxDocs) {
    }

    // Обновляем базу знаний
    const success = await updateKnowledgeBase(limitedDocuments)

    if (success) {
      return NextResponse.json({
        success: true,
        message: 'База знаний обновлена',
        documentsProcessed: limitedDocuments.length,
        totalDocuments: documents.length,
        type: updateType
      })
    } else {
      console.error('[✗] Ошибка обновления базы знаний')
      return NextResponse.json({
        success: false,
        error: 'Failed to update knowledge base'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Ошибка обновления базы знаний:', error)
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 })
  }
}