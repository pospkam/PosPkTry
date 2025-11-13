'use client';

import React, { useState, useRef } from 'react';

interface ImageUploadProps {
  onUpload: (urls: string[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
}

export function ImageUpload({ onUpload, maxFiles = 5, maxSizeMB = 5 }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);

    if (files.length === 0) return;

    if (files.length > maxFiles) {
      alert(`Максимум ${maxFiles} файлов`);
      return;
    }

    // Проверка размера
    const oversized = files.find(f => f.size > maxSizeMB * 1024 * 1024);
    if (oversized) {
      alert(`Файл слишком большой (максимум ${maxSizeMB}MB)`);
      return;
    }

    // Превью
    const previewUrls = files.map(file => URL.createObjectURL(file));
    setPreviews(previewUrls);

    // Загрузка на сервер
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success) {
        onUpload(result.data.files);
      } else {
        alert(`Ошибка: ${result.error}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
      alert('Ошибка загрузки файлов');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className="px-4 py-2 bg-premium-gold hover:bg-premium-gold/80 text-premium-black font-bold rounded-lg transition-colors disabled:opacity-50"
      >
        {uploading ? '⏳ Загрузка...' : '📸 Выбрать изображения'}
      </button>

      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          {previews.map((url, index) => (
            <div key={index} className="relative aspect-square rounded-lg overflow-hidden bg-white/5">
              <img src={url} alt={`Preview ${index + 1}`} className="w-full h-full object-cover" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

