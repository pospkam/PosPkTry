import { NextRequest, NextResponse } from 'next/server';

/**
 * API endpoint для проверки Telegram Bot
 * GET /api/telegram/check
 */
export async function GET(request: NextRequest) {
  const botToken = process.env.TELEGRAM_BOT_TOKEN;

  if (!botToken) {
    return NextResponse.json({
      success: false,
      error: 'TELEGRAM_BOT_TOKEN не настроен в переменных окружения',
      instructions: 'Добавьте TELEGRAM_BOT_TOKEN в .env файл'
    }, { status: 500 });
  }

  try {
    // Проверка getMe
    const meResponse = await fetch(`https://api.telegram.org/bot${botToken}/getMe`);
    const meData = await meResponse.json();

    if (!meData.ok) {
      return NextResponse.json({
        success: false,
        error: 'Неверный токен бота',
        details: meData.description
      }, { status: 401 });
    }

    // Проверка webhook
    const webhookResponse = await fetch(`https://api.telegram.org/bot${botToken}/getWebhookInfo`);
    const webhookData = await webhookResponse.json();

    // Проверка updates
    const updatesResponse = await fetch(`https://api.telegram.org/bot${botToken}/getUpdates?limit=1`);
    const updatesData = await updatesResponse.json();

    return NextResponse.json({
      success: true,
      bot: {
        id: meData.result.id,
        name: meData.result.first_name,
        username: meData.result.username,
        is_bot: meData.result.is_bot,
        can_join_groups: meData.result.can_join_groups,
        can_read_all_group_messages: meData.result.can_read_all_group_messages,
        supports_inline_queries: meData.result.supports_inline_queries
      },
      webhook: {
        url: webhookData.result.url || null,
        pending_updates: webhookData.result.pending_update_count || 0,
        last_error: webhookData.result.last_error_message || null
      },
      updates: {
        available: updatesData.ok,
        count: updatesData.result?.length || 0
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при проверке Telegram API',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
