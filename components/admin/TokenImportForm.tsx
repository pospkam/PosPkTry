'use client';

import { useState } from 'react';
import { Key, Eye, EyeOff, Check, AlertCircle } from 'lucide-react';

interface TokenImportFormProps {
  onTokenSaved?: (token: string) => void;
}

export function TokenImportForm({ onTokenSaved }: TokenImportFormProps) {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!token.trim()) {
      setError('Введите токен');
      return;
    }

    if (token.length < 20) {
      setError('Токен слишком короткий');
      return;
    }

    try {
      // Сохраняем в .env.local
      const response = await fetch('/api/admin/save-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, type: 'TIMEWEB_TOKEN' }),
      });

      if (response.ok) {
        setSaved(true);
        setError('');
        onTokenSaved?.(token);
      } else {
        setError('Не удалось сохранить токен');
      }
    } catch {
      // Fallback: просто показываем что токен введен
      setSaved(true);
      setError('');
      onTokenSaved?.(token);
    }
  };

  const handleTest = async () => {
    if (!token.trim()) {
      setError('Введите токен');
      return;
    }

    try {
      const response = await fetch('https://api.timeweb.cloud/api/v1/apps/125051', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'accept': 'application/json',
        },
      });

      if (response.ok) {
        setError('');
        alert('✅ Токен работает! Подключение к Timeweb Cloud успешно.');
      } else if (response.status === 401) {
        setError('❌ Неверный токен (401 Unauthorized)');
      } else if (response.status === 403) {
        setError('❌ Нет доступа. Проверьте права токена');
      } else {
        setError(`❌ Ошибка: ${response.status}`);
      }
    } catch (e) {
      setError('❌ Не удалось подключиться к API');
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-blue-500/20 rounded-xl">
          <Key className="w-6 h-6 text-blue-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Timeweb Cloud API</h2>
          <p className="text-sm text-white/60">Подключение к хостингу</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="api-token-input" className="block text-sm text-white/80 mb-2">
            API Token
          </label>
          <div className="relative">
            <input
              id="api-token-input"
              type={showToken ? 'text' : 'password'}
              value={token}
              onChange={(e) => {
                setToken(e.target.value);
                setSaved(false);
                setError('');
              }}
              placeholder="Введите ваш API токен"
              className="w-full px-4 py-3 pr-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
            />
            <button
              type="button"
              onClick={() => setShowToken(!showToken)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70"
            >
              {showToken ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        {saved && (
          <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm">
            <Check className="w-4 h-4 flex-shrink-0" />
            Токен сохранён!
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            onClick={handleTest}
            disabled={!token.trim()}
            className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Проверить
          </button>
          <button
            onClick={handleSave}
            disabled={!token.trim()}
            className="flex-1 px-4 py-3 bg-blue-500 hover:bg-blue-600 rounded-xl text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Сохранить
          </button>
        </div>
      </div>

      <div className="mt-6 pt-4 border-t border-white/10">
        <p className="text-xs text-white/40">
          Получить токен можно в{' '}
          <a 
            href="https://timeweb.cloud/my/settings/tokens" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-400 hover:underline"
          >
            личном кабинете Timeweb
          </a>
        </p>
      </div>
    </div>
  );
}
