'use client';

import React, { useState, useEffect } from 'react';
import { DataTable } from '../shared/DataTable';
import { LoadingSpinner } from '../shared/LoadingSpinner';
import { StatusBadge } from '../shared/StatusBadge';
import toast from 'react-hot-toast';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  type: string;
  htmlContent: string;
  textContent: string;
  variables: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export function EmailTemplatesManager() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/settings/email-templates');
      const result = await response.json();

      if (result.success) {
        setTemplates(result.data.templates);
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('Ошибка загрузки шаблонов');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTemplate = async (template: Partial<EmailTemplate>) => {
    try {
      const isNew = !template.id;
      const url = isNew
        ? '/api/admin/settings/email-templates'
        : `/api/admin/settings/email-templates/${template.id}`;

      const response = await fetch(url, {
        method: isNew ? 'POST' : 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(template)
      });

      const result = await response.json();

      if (result.success) {
        fetchTemplates();
        setEditingTemplate(null);
        setShowCreateForm(false);
        toast.success(isNew ? 'Шаблон создан успешно' : 'Шаблон обновлен успешно');
      } else {
        toast.error(`Ошибка: ${result.error}`);
      }
    } catch (err) {
      toast.error('Ошибка при сохранении шаблона');
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (!confirm('Вы уверены, что хотите удалить этот шаблон?')) return;

    try {
      const response = await fetch(`/api/admin/settings/email-templates/${templateId}`, {
        method: 'DELETE'
      });

      const result = await response.json();

      if (result.success) {
        fetchTemplates();
        toast.success('Шаблон удален успешно');
      } else {
        toast.error(`Ошибка: ${result.error}`);
      }
    } catch (err) {
      toast.error('Ошибка при удалении шаблона');
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Название',
      render: (template: EmailTemplate) => (
        <div>
          <div className="font-medium text-[var(--text-primary)]">{template.name}</div>
          <div className="text-[var(--text-muted)] text-sm">{template.subject}</div>
        </div>
      )
    },
    {
      key: 'type',
      header: 'Тип',
      render: (template: EmailTemplate) => (
        <div className="capitalize text-[var(--accent)] font-medium">
          {template.type === 'bookingConfirmation' ? 'Подтверждение бронирования' :
           template.type === 'paymentConfirmation' ? 'Подтверждение оплаты' :
           template.type === 'tourReminder' ? 'Напоминание о туре' :
           template.type === 'bookingCancellation' ? 'Отмена бронирования' :
           template.type === 'welcome' ? 'Приветственное письмо' :
           template.type === 'passwordReset' ? 'Восстановление пароля' :
           template.type === 'partnerVerification' ? 'Верификация партнера' :
           template.type}
        </div>
      )
    },
    {
      key: 'isActive',
      header: 'Статус',
      render: (template: EmailTemplate) => (
        <StatusBadge status={template.isActive ? 'active' : 'inactive'} />
      )
    },
    {
      key: 'updatedAt',
      header: 'Обновлено',
      render: (template: EmailTemplate) => (
        <div className="text-[var(--text-muted)] text-sm">
          {new Date(template.updatedAt).toLocaleDateString('ru-RU')}
        </div>
      )
    },
    {
      key: 'actions',
      header: 'Действия',
      render: (template: EmailTemplate) => (
        <div className="flex gap-2">
          <button
            onClick={() => setEditingTemplate(template)}
            className="px-3 py-1 bg-[var(--accent)]/20 hover:bg-[var(--accent)]/30 text-[var(--accent)] rounded text-sm transition-colors"
          >
            Изменить
          </button>
          <button
            onClick={() => handleDeleteTemplate(template.id)}
            className="px-3 py-1 bg-[var(--danger)]/15 hover:bg-[var(--danger)]/15 text-[var(--danger)] rounded text-sm transition-colors"
          >
            Удалить
          </button>
        </div>
      )
    }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <LoadingSpinner message="Загрузка email шаблонов..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[var(--danger)]/15 border border-[var(--danger)]/20 rounded-lg p-6 text-center">
        <p className="text-[var(--danger)] mb-4">Ошибка загрузки шаблонов</p>
        <button
          onClick={fetchTemplates}
          className="px-4 py-2 bg-[var(--danger)]/15 hover:bg-[var(--danger)]/15 text-[var(--danger)] rounded-lg transition-colors"
        >
          Повторить
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Заголовок */}
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-bold text-[var(--text-primary)]">Email шаблоны</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="px-6 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-[var(--text-primary)] font-bold rounded-lg transition-colors"
        >
          Создать шаблон
        </button>
      </div>

      {/* Таблица шаблонов */}
      <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
        <DataTable
          data={templates}
          columns={columns}
          emptyMessage="Нет email шаблонов для отображения"
        />
      </div>

      {/* Форма создания/редактирования */}
      {(editingTemplate || showCreateForm) && (
        <EmailTemplateForm
          template={editingTemplate}
          onSave={handleSaveTemplate}
          onCancel={() => {
            setEditingTemplate(null);
            setShowCreateForm(false);
          }}
        />
      )}
    </div>
  );
}

// Компонент формы для создания/редактирования шаблона
interface EmailTemplateFormProps {
  template: EmailTemplate | null;
  onSave: (template: Partial<EmailTemplate>) => void;
  onCancel: () => void;
}

function EmailTemplateForm({ template, onSave, onCancel }: EmailTemplateFormProps) {
  const [formData, setFormData] = useState({
    name: template?.name || '',
    subject: template?.subject || '',
    type: template?.type || 'bookingConfirmation',
    htmlContent: template?.htmlContent || '',
    textContent: template?.textContent || '',
    variables: template?.variables || [],
    isActive: template?.isActive ?? true
  });

  const [newVariable, setNewVariable] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.subject || !formData.type || !formData.htmlContent) {
      toast.error('Пожалуйста, заполните все обязательные поля');
      return;
    }

    onSave({
      ...template,
      ...formData
    });
  };

  const addVariable = () => {
    if (newVariable.trim() && !formData.variables.includes(newVariable.trim())) {
      setFormData(prev => ({
        ...prev,
        variables: [...prev.variables, newVariable.trim()]
      }));
      setNewVariable('');
    }
  };

  const removeVariable = (variable: string) => {
    setFormData(prev => ({
      ...prev,
      variables: prev.variables.filter(v => v !== variable)
    }));
  };

  return (
    <div className="bg-[var(--bg-card)] border border-[var(--border)] rounded-lg p-6">
      <h4 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
        {template ? 'Редактирование шаблона' : 'Создание шаблона'}
      </h4>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="template-name" className="block text-[var(--text-primary)] font-medium mb-2">
              Название <span className="text-[var(--danger)]">*</span>
            </label>
            <input
              id="template-name"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
              required
            />
          </div>

          <div>
            <label htmlFor="template-type" className="block text-[var(--text-primary)] font-medium mb-2">
              Тип <span className="text-[var(--danger)]">*</span>
            </label>
            <select
              id="template-type"
              value={formData.type}
              onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            >
              <option value="bookingConfirmation">Подтверждение бронирования</option>
              <option value="paymentConfirmation">Подтверждение оплаты</option>
              <option value="tourReminder">Напоминание о туре</option>
              <option value="bookingCancellation">Отмена бронирования</option>
              <option value="welcome">Приветственное письмо</option>
              <option value="passwordReset">Восстановление пароля</option>
              <option value="partnerVerification">Верификация партнера</option>
            </select>
          </div>
        </div>

        <div>
          <label htmlFor="template-subject" className="block text-[var(--text-primary)] font-medium mb-2">
            Тема письма <span className="text-[var(--danger)]">*</span>
          </label>
          <input
            id="template-subject"
            value={formData.subject}
            onChange={(e) => setFormData(prev => ({ ...prev, subject: e.target.value }))}
            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            required
          />
        </div>

        <div>
          <label htmlFor="template-html" className="block text-[var(--text-primary)] font-medium mb-2">
            HTML контент <span className="text-[var(--danger)]">*</span>
          </label>
          <textarea
            id="template-html"
            value={formData.htmlContent}
            onChange={(e) => setFormData(prev => ({ ...prev, htmlContent: e.target.value }))}
            rows={10}
            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none font-mono text-sm"
            placeholder="<h1>Привет!</h1>"
            required
          />
        </div>

        <div>
          <label htmlFor="template-text" className="block text-[var(--text-primary)] font-medium mb-2">
            Text версия (опционально)
          </label>
          <textarea
            id="template-text"
            value={formData.textContent}
            onChange={(e) => setFormData(prev => ({ ...prev, textContent: e.target.value }))}
            rows={5}
            className="w-full px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] resize-none font-mono text-sm"
            placeholder="Привет!"
          />
        </div>

        <div>
          <label htmlFor="template-variable-input" className="block text-[var(--text-primary)] font-medium mb-2">
            Переменные шаблона
          </label>
          <div className="flex gap-2 mb-3">
            <input
              id="template-variable-input"
              type="text"
              value={newVariable}
              onChange={(e) => setNewVariable(e.target.value)}
              placeholder="Например: userName"
              className="flex-1 px-3 py-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            />
            <button
              type="button"
              onClick={addVariable}
              className="px-4 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-[var(--text-primary)] font-bold rounded-lg transition-colors"
            >
              Добавить
            </button>
          </div>

          {formData.variables.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {formData.variables.map(variable => (
                <span
                  key={variable}
                  className="inline-flex items-center gap-2 px-3 py-1 bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg text-sm"
                >
                  {variable}
                  <button
                    type="button"
                    onClick={() => removeVariable(variable)}
                    className="hover:text-[var(--danger)]"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[var(--text-primary)]">
            <input
              type="checkbox"
              checked={formData.isActive}
              onChange={(e) => setFormData(prev => ({ ...prev, isActive: e.target.checked }))}
              className="rounded border-[var(--border)] bg-[var(--bg-card)] text-[var(--accent)] focus:ring-[var(--accent)]"
            />
            Активен
          </label>
        </div>

        <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
          <button
            type="submit"
            className="px-6 py-2 bg-[var(--accent)] hover:bg-[var(--accent)]/80 text-[var(--text-primary)] font-bold rounded-lg transition-colors"
          >
            {template ? 'Сохранить изменения' : 'Создать шаблон'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 bg-[var(--bg-card)] hover:bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg transition-colors"
          >
            Отмена
          </button>
        </div>
      </form>
    </div>
  );
}

