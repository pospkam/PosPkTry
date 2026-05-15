# Обновление переменных окружения Timeweb App 175477
# Запустить: .\update-timeweb-envs.ps1
# Скрипт читает значения из .env.local (или задай их ниже напрямую)

$APP_ID = "175477"

# --- Токен Timeweb API (новый, созданный 2026-05-14) ---
$TOKEN = "eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI4MTE2MjJkMi00MjlhLTQ5NjgtOWRjNy05MDA2NWEyZmE1YWEiLCJpYXQiOjE3Nzc3NTg1NDl9.AXYO381WK94x3e3HhLCZWVyw8VL3t4AxD5jPXUrD7PKCSm_eJWlARA9GKp7gYbyX5PPjCQ0eoSOYK--5RqJBohvOM0psqJhU8Y1yBsI9y-LjFMA8cMTpyNM_kMBw9Q_yfkuYNnxePiMD-103QyYFd3PY_HwdLZ1nUCriFKAW8iqjKqcCD64Vud8VTtiCbPGGlWQtw0y7HScBKPJPxmfBz7h3GcCJSf_SYfQEIHQrG_D2JfYarEmNZnPW9jVze3qzRwtXbgzxG4nUzcuKIN-8_6KuFfihSixAuesxQEAAfEukGiOo2G41tm7s398HjUHaFcy4NbR9FCS787O7JMBNdqBzG0BffFoTXEhRtlTFVtvbfmXWrhWWYMpo1jaSfe9uJiluNjV4YAp19EMmvXojdWvNlIaX0kcXRTG1_MoqfE8DtnmBuVdcW04KxMrou7VtQ-3R46MUumZBFIVQONxSn8MjeHubHWe392hrOMdFq5QtM2jn4dm-TdH9T215ePrq"

# --- Значения берём из вашего .env.local ---
# Положите .env.local рядом со скриптом, или задайте напрямую ниже

function Get-EnvValue($key, $default = "") {
    $envFile = Join-Path $PSScriptRoot ".env.local"
    if (Test-Path $envFile) {
        $line = Get-Content $envFile | Where-Object { $_ -match "^$key=" } | Select-Object -First 1
        if ($line) { return ($line -split "=", 2)[1] }
    }
    return $default
}

$DB_URL    = "postgresql://gen_user:b>=PHE1g40PUL#@94.228.112.62:5432/default_db?sslmode=require"
$JWT       = Get-EnvValue "JWT_SECRET"       "5bdc0f436a0adf5f964535640dc56390bac171a967fe19c82e7547fe67a94966"
$NEXTAUTH_S= Get-EnvValue "NEXTAUTH_SECRET"  "7e47f5fb5a246081c0bf78940e73f6df24f6d9fc315d72bf16106ec19f031c64"
$DEEPSEEK  = Get-EnvValue "DEEPSEEK_API_KEY" "sk-b2f8fc20f5244ce2b09cd52da46de3f2"
$ANTHROPIC = Get-EnvValue "ANTHROPIC_API_KEY"
$OPENROUTER= Get-EnvValue "OPENROUTER_API_KEY"
$OR_API    = Get-EnvValue "OR_API_KEY"
$OR_MGMT   = Get-EnvValue "OPENROUTER_MANAGEMENT_KEY"
$MINIMAX   = Get-EnvValue "MINIMAX_API_KEY"
$XAI       = Get-EnvValue "XAI_API_KEY"     "xai-a9aGzDm2eR95178F"
$TG_TOKEN  = Get-EnvValue "TELEGRAM_BOT_TOKEN" "8507293148:AAHWiq6V_t6rRriddxxRFdF_wyp1SZGw_zU"
$TG_CHAT   = Get-EnvValue "TELEGRAM_CHAT_ID"   "171286547"
$TG_CHAN   = Get-EnvValue "TELEGRAM_CHANNEL_ID" "1003519846560"
$TG_WHK    = Get-EnvValue "TELEGRAM_WEBHOOK_SECRET" "kh-webhook-2026"
$MAX_BOT   = Get-EnvValue "MAX_BOT_TOKEN"
$CRON      = Get-EnvValue "CRON_SECRET"     "93cb1fbc1f67bcab036693ef0802ed86b35edc62a938b02333ecd8819655d28f"

$envs = @(
    @{ name = "DATABASE_URL";               value = $DB_URL },
    @{ name = "JWT_SECRET";                 value = $JWT },
    @{ name = "NEXTAUTH_SECRET";            value = $NEXTAUTH_S },
    @{ name = "NODE_ENV";                   value = "production" },
    @{ name = "NEXTAUTH_URL";               value = "https://pospkam-pospktry-c1f3.twc1.net" },
    @{ name = "NEXT_PUBLIC_APP_URL";        value = "https://pospkam-pospktry-c1f3.twc1.net" },
    @{ name = "NEXT_PUBLIC_API_BASE_URL";   value = "https://pospkam-pospktry-c1f3.twc1.net" },
    @{ name = "DEEPSEEK_API_KEY";           value = $DEEPSEEK },
    @{ name = "OPENROUTER_API_KEY";         value = $OPENROUTER },
    @{ name = "OR_API_KEY";                 value = $OR_API },
    @{ name = "OPENROUTER_MANAGEMENT_KEY";  value = $OR_MGMT },
    @{ name = "ANTHROPIC_API_KEY";          value = $ANTHROPIC },
    @{ name = "MINIMAX_API_KEY";            value = $MINIMAX },
    @{ name = "XAI_API_KEY";               value = $XAI },
    @{ name = "TELEGRAM_BOT_TOKEN";         value = $TG_TOKEN },
    @{ name = "TELEGRAM_CHAT_ID";           value = $TG_CHAT },
    @{ name = "TELEGRAM_CHANNEL_ID";        value = $TG_CHAN },
    @{ name = "TELEGRAM_WEBHOOK_SECRET";    value = $TG_WHK },
    @{ name = "MAX_BOT_TOKEN";              value = $MAX_BOT },
    @{ name = "CRON_SECRET";               value = $CRON },
    @{ name = "TIMEWEB_TOKEN";              value = $TOKEN },
    @{ name = "TIMEWEB_AI_AGENT_ID";        value = "8d849ff1-d8aa-44b7-89c8-e4031ef3989c" }
)

$body = @{ envs = $envs } | ConvertTo-Json -Depth 5

Write-Host "Updating Timeweb app $APP_ID env vars..." -ForegroundColor Cyan

$response = Invoke-RestMethod `
    -Uri "https://api.timeweb.cloud/api/v1/apps/$APP_ID" `
    -Method Patch `
    -Headers @{ "Authorization" = "Bearer $TOKEN"; "Content-Type" = "application/json" } `
    -Body $body

Write-Host "Done!" -ForegroundColor Green
Write-Host ($response | ConvertTo-Json -Depth 3)
