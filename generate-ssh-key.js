const crypto = require('crypto');
const fs = require('fs');

// Генерация ED25519 ключа
const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: {
    type: 'spki',
    format: 'pem'
  },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem'
  }
});

// Конвертация публичного ключа в формат OpenSSH
const publicKeyBuffer = Buffer.from(publicKey.split('\n').slice(1, -2).join(''), 'base64');
const publicKeySSH = `ssh-ed25519 ${publicKeyBuffer.toString('base64')} kamhub-deploy@timeweb`;

console.log('\n========================================');
console.log(' SSH КЛЮЧ ДЛЯ TIMEWEB CLOUD СГЕНЕРИРОВАН!');
console.log('========================================\n');

console.log(' ПУБЛИЧНЫЙ КЛЮЧ (скопируйте и добавьте на https://timeweb.cloud/my/servers/5898003/ssh-keys):\n');
console.log(publicKeySSH);
console.log('\n');

console.log('========================================');
console.log('[OK] Инструкция:');
console.log('1. Скопируйте публичный ключ выше');
console.log('2. Откройте https://timeweb.cloud/my/servers/5898003/ssh-keys');
console.log('3. Нажмите "Добавить SSH ключ"');
console.log('4. Вставьте ключ в поле "Public key"');
console.log('5. Назовите его "kamhub-deploy"');
console.log('6. Нажмите "Добавить"');
console.log('========================================\n');

// Сохраняем ключи в файлы
fs.writeFileSync('kamhub_deploy_key', privateKey);
fs.writeFileSync('kamhub_deploy_key.pub', publicKeySSH);

console.log('[OK] Ключи сохранены:');
console.log('   - Приватный: kamhub_deploy_key');
console.log('   - Публичный: kamhub_deploy_key.pub');
console.log('\n!  ВАЖНО: Не делитесь приватным ключом!\n');

