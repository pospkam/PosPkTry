# AI-TGBOT (KamchatourHub)

Telegram-бот с Claude/Grok, RAG, голосом и модерацией.

## Возможности
- Автоответы на русском/английском (Claude, Grok, OpenAI)
- RAG: бот помнит историю чата (PostgreSQL)
- Модерация, антиспам (базово)
- Платежи через Stars (TODO)
- Голосовые сообщения (TODO)

## Быстрый старт

```bash
git clone ...
cd bots/ai-tgbot
pnpm install
cp .env.example .env # и заполни токены
pnpm dev
```

## Переменные окружения
- TELEGRAM_TOKEN — токен бота
- CLAUDE_API_KEY — ключ Anthropic Claude
- GROK_API_KEY — ключ x.ai Grok
- OPENAI_API_KEY — (опционально)
- POSTGRES_URL — строка подключения к PostgreSQL

## Структура
- index.js — основной бот
- .env.example — пример переменных

## TODO
- Голосовые сообщения (Whisper/TTS)
- Модерация/антиспам
- Платежи через Stars
- Dockerfile
