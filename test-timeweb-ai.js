/**
 * Тестовый скрипт для проверки Timeweb AI
 */

// Устанавливаем переменные окружения
process.env.TIMEWEB_AI_AGENT_ID = '3933ea81-05e2-470e-80de-80dc67c1101f';
process.env.TIMEWEB_API_TOKEN = 'eyJhbGciOiJSUzUxMiIsInR5cCI6IkpXVCIsImtpZCI6IjFrYnhacFJNQGJSI0tSbE1xS1lqIn0.eyJ1c2VyIjoicGE0MjIxMDgiLCJ0eXBlIjoiYXBpX2tleSIsImFwaV9rZXlfaWQiOiI0MmZmZTY1MC02OWI4LTRmZmQtYTFkOC02OWRkMjMwM2QyY2MiLCJpYXQiOjE3NjE3ODUzNDl9.SFHpwgy9kr-EH2CwN6K1REkOl7KCpiUnMk5ivTRljEaWl8iE-B-BMjaJxaFhpdB2dqcb33ky2oyfwxkU1Sszrbo-8UINnFO5SothY4P6WC8kSSHxFlLI2i0xGCa3YzgyYZ1Wgn2a0jf__ZcyZi7ZsaJkuold9NAeeGCCrAUbdVsr39-fLDL_EKh0iekq_tuO59f_BCmg7Poe7xKlmNYzu2hy3GnfNp3ueKW52H6kFkGwibixS3tWKCHkPpyTAjRztWKCnDZOOG6xDk4sSiPPMlZOEfFzzkpKkizQ9CykBC06SXwmT2uPRR2NyZJIY-PZd4AVZ34H1jXQ-NGquRPi_aYiywt3LtOVDRarpVErBdk6I0qO0Yf33zICvMN-yFpXuY_oSlE8v3C-02XHnYLsMXcHTsUB4ISkJrhglBkv-hTzuiQxwAEZp0eHOEq8YNz6qOLU3RcaNgg0DWGXMDrMzObYx2NknrZUCMbRFftIU-C1Ilo8Ayy98MwI3J77X62p';
process.env.TIMEWEB_SERVER_ID = '1735784';

async function callTimeweb(prompt) {
  const agentId = process.env.TIMEWEB_AI_AGENT_ID;
  if (!agentId) {
    console.error('❌ TIMEWEB_AI_AGENT_ID не установлен');
    return null;
  }

  // Используем правильный URL из документации
  const url = `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/${agentId}/v1`;

  console.log(`🔗 URL агента: ${url}`);
  console.log(`📝 Prompt: ${prompt}`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.TIMEWEB_API_TOKEN}`,
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 400,
        temperature: 0.3
      }),
    });

    console.log(`📊 Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const data = await response.json();
      console.log('📦 Response data:', JSON.stringify(data, null, 2));
      const content = data?.choices?.[0]?.message?.content || data?.response || data?.answer || data?.message || '';
      console.log(`✅ Answer: ${content}`);
      return content;
    } else {
      console.log(`❌ Ошибка: ${response.status} ${response.statusText}`);
      const errorText = await response.text();
      console.log('Error response:', errorText);
      return null;
    }

  } catch (error) {
    console.error('❌ Сетевая ошибка:', error.message);
    return null;
  }
}

// Проверка доступности сервиса
async function checkServiceAvailability() {
  console.log('🔍 Проверяем доступность Timeweb Cloud AI...\n');

  const baseUrls = [
    'https://agent.timeweb.cloud',
    'https://timeweb.cloud',
    'https://api.timeweb.cloud',
  ];

  for (const url of baseUrls) {
    try {
      console.log(`🌐 Проверяем: ${url}`);
      const response = await fetch(url, { method: 'GET' });
      console.log(`📊 Status: ${response.status} ${response.statusText}`);

      if (response.ok) {
        console.log('✅ Сервис доступен!');
        const text = await response.text();
        console.log(`📄 Содержимое (первые 200 символов): ${text.substring(0, 200)}...`);
      } else {
        console.log('❌ Сервис не отвечает');
      }
    } catch (error) {
      console.log(`❌ Ошибка подключения: ${error.message}`);
    }
    console.log('');
  }
}

// Тестируем
async function test() {
  await checkServiceAvailability();

  console.log('🤖 Тестирование Timeweb AI API...\n');

  const testPrompt = 'Привет! Расскажи кратко о Камчатке.';
  const result = await callTimeweb(testPrompt);

  if (result) {
    console.log('\n🎉 УСПЕХ! Timeweb AI работает!');
  } else {
    console.log('\n❌ ОШИБКА: Timeweb AI не отвечает');
    console.log('\n💡 Возможные причины:');
    console.log('   • Неправильный Agent ID');
    console.log('   • API требует авторизации');
    console.log('   • URL API изменился');
    console.log('   • Агент не активен');
    console.log('\n🔗 Проверьте документацию: https://timeweb.cloud/');
  }
}

test();
