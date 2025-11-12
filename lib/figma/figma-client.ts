// =============================================
// FIGMA API ИНТЕГРАЦИЯ
// Импорт дизайнов и компонентов из Figma
// =============================================

const FIGMA_CLIENT_ID = '4WZfL71ZBHuFZ9FD6zcJZz';
const FIGMA_CLIENT_SECRET = 'FIGMA_SECRET_REMOVED';
const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFile {
  document: any;
  components: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  type: string;
  styles?: any;
}

class FigmaClient {
  private accessToken: string | null = null;

  /**
   * Авторизация через OAuth
   */
  async authorize(code: string): Promise<string> {
    try {
      const response = await fetch('https://www.figma.com/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: FIGMA_CLIENT_ID,
          client_secret: FIGMA_CLIENT_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        return data.access_token;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Figma authorization error:', error);
      throw error;
    }
  }

  /**
   * Получить файл из Figma
   */
  async getFile(fileKey: string): Promise<FigmaFile> {
    if (!this.accessToken) {
      throw new Error('Not authorized. Call authorize() first.');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Figma file:', error);
      throw error;
    }
  }

  /**
   * Получить компоненты из файла
   */
  async getComponents(fileKey: string): Promise<FigmaComponent[]> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/components`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return Object.values(data.meta?.components || {});
    } catch (error) {
      console.error('Error fetching components:', error);
      throw error;
    }
  }

  /**
   * Экспорт изображений из Figma
   */
  async exportImages(
    fileKey: string,
    nodeIds: string[],
    format: 'png' | 'jpg' | 'svg' = 'png',
    scale: number = 2
  ): Promise<Record<string, string>> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const params = new URLSearchParams({
        ids: nodeIds.join(','),
        format,
        scale: scale.toString()
      });

      const response = await fetch(
        `${FIGMA_API_BASE}/images/${fileKey}?${params}`,
        {
          headers: {
            'X-Figma-Token': this.accessToken
          }
        }
      );

      const data = await response.json();
      return data.images || {};
    } catch (error) {
      console.error('Error exporting images:', error);
      throw error;
    }
  }

  /**
   * Получить стили из файла
   */
  async getStyles(fileKey: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/styles`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data.meta?.styles || {};
    } catch (error) {
      console.error('Error fetching styles:', error);
      throw error;
    }
  }

  /**
   * Конвертировать Figma цвета в CSS
   */
  figmaColorToCSS(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  /**
   * Генерация URL для авторизации
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: FIGMA_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
      scope: 'file_read',
      state: state || 'random_state',
      response_type: 'code'
    });

    return `https://www.figma.com/oauth?${params}`;
  }
}

// Singleton instance
export const figmaClient = new FigmaClient();

// Helper для прямого доступа с Personal Access Token
export async function getFigmaFileWithToken(fileKey: string, token: string): Promise<FigmaFile> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': token
    }
  });

  return await response.json();
}

// FIGMA API ИНТЕГРАЦИЯ
// Импорт дизайнов и компонентов из Figma
// =============================================

const FIGMA_CLIENT_ID = '4WZfL71ZBHuFZ9FD6zcJZz';
const FIGMA_CLIENT_SECRET = 'FIGMA_SECRET_REMOVED';
const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFile {
  document: any;
  components: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  type: string;
  styles?: any;
}

class FigmaClient {
  private accessToken: string | null = null;

  /**
   * Авторизация через OAuth
   */
  async authorize(code: string): Promise<string> {
    try {
      const response = await fetch('https://www.figma.com/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: FIGMA_CLIENT_ID,
          client_secret: FIGMA_CLIENT_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        return data.access_token;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Figma authorization error:', error);
      throw error;
    }
  }

  /**
   * Получить файл из Figma
   */
  async getFile(fileKey: string): Promise<FigmaFile> {
    if (!this.accessToken) {
      throw new Error('Not authorized. Call authorize() first.');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Figma file:', error);
      throw error;
    }
  }

  /**
   * Получить компоненты из файла
   */
  async getComponents(fileKey: string): Promise<FigmaComponent[]> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/components`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return Object.values(data.meta?.components || {});
    } catch (error) {
      console.error('Error fetching components:', error);
      throw error;
    }
  }

  /**
   * Экспорт изображений из Figma
   */
  async exportImages(
    fileKey: string,
    nodeIds: string[],
    format: 'png' | 'jpg' | 'svg' = 'png',
    scale: number = 2
  ): Promise<Record<string, string>> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const params = new URLSearchParams({
        ids: nodeIds.join(','),
        format,
        scale: scale.toString()
      });

      const response = await fetch(
        `${FIGMA_API_BASE}/images/${fileKey}?${params}`,
        {
          headers: {
            'X-Figma-Token': this.accessToken
          }
        }
      );

      const data = await response.json();
      return data.images || {};
    } catch (error) {
      console.error('Error exporting images:', error);
      throw error;
    }
  }

  /**
   * Получить стили из файла
   */
  async getStyles(fileKey: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/styles`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data.meta?.styles || {};
    } catch (error) {
      console.error('Error fetching styles:', error);
      throw error;
    }
  }

  /**
   * Конвертировать Figma цвета в CSS
   */
  figmaColorToCSS(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  /**
   * Генерация URL для авторизации
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: FIGMA_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
      scope: 'file_read',
      state: state || 'random_state',
      response_type: 'code'
    });

    return `https://www.figma.com/oauth?${params}`;
  }
}

// Singleton instance
export const figmaClient = new FigmaClient();

// Helper для прямого доступа с Personal Access Token
export async function getFigmaFileWithToken(fileKey: string, token: string): Promise<FigmaFile> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': token
    }
  });

  return await response.json();
}

// FIGMA API ИНТЕГРАЦИЯ
// Импорт дизайнов и компонентов из Figma
// =============================================

const FIGMA_CLIENT_ID = '4WZfL71ZBHuFZ9FD6zcJZz';
const FIGMA_CLIENT_SECRET = 'FIGMA_SECRET_REMOVED';
const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFile {
  document: any;
  components: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  type: string;
  styles?: any;
}

class FigmaClient {
  private accessToken: string | null = null;

  /**
   * Авторизация через OAuth
   */
  async authorize(code: string): Promise<string> {
    try {
      const response = await fetch('https://www.figma.com/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: FIGMA_CLIENT_ID,
          client_secret: FIGMA_CLIENT_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        return data.access_token;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Figma authorization error:', error);
      throw error;
    }
  }

  /**
   * Получить файл из Figma
   */
  async getFile(fileKey: string): Promise<FigmaFile> {
    if (!this.accessToken) {
      throw new Error('Not authorized. Call authorize() first.');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Figma file:', error);
      throw error;
    }
  }

  /**
   * Получить компоненты из файла
   */
  async getComponents(fileKey: string): Promise<FigmaComponent[]> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/components`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return Object.values(data.meta?.components || {});
    } catch (error) {
      console.error('Error fetching components:', error);
      throw error;
    }
  }

  /**
   * Экспорт изображений из Figma
   */
  async exportImages(
    fileKey: string,
    nodeIds: string[],
    format: 'png' | 'jpg' | 'svg' = 'png',
    scale: number = 2
  ): Promise<Record<string, string>> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const params = new URLSearchParams({
        ids: nodeIds.join(','),
        format,
        scale: scale.toString()
      });

      const response = await fetch(
        `${FIGMA_API_BASE}/images/${fileKey}?${params}`,
        {
          headers: {
            'X-Figma-Token': this.accessToken
          }
        }
      );

      const data = await response.json();
      return data.images || {};
    } catch (error) {
      console.error('Error exporting images:', error);
      throw error;
    }
  }

  /**
   * Получить стили из файла
   */
  async getStyles(fileKey: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/styles`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data.meta?.styles || {};
    } catch (error) {
      console.error('Error fetching styles:', error);
      throw error;
    }
  }

  /**
   * Конвертировать Figma цвета в CSS
   */
  figmaColorToCSS(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  /**
   * Генерация URL для авторизации
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: FIGMA_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
      scope: 'file_read',
      state: state || 'random_state',
      response_type: 'code'
    });

    return `https://www.figma.com/oauth?${params}`;
  }
}

// Singleton instance
export const figmaClient = new FigmaClient();

// Helper для прямого доступа с Personal Access Token
export async function getFigmaFileWithToken(fileKey: string, token: string): Promise<FigmaFile> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': token
    }
  });

  return await response.json();
}

// FIGMA API ИНТЕГРАЦИЯ
// Импорт дизайнов и компонентов из Figma
// =============================================

const FIGMA_CLIENT_ID = '4WZfL71ZBHuFZ9FD6zcJZz';
const FIGMA_CLIENT_SECRET = 'FIGMA_SECRET_REMOVED';
const FIGMA_API_BASE = 'https://api.figma.com/v1';

export interface FigmaFile {
  document: any;
  components: Record<string, any>;
  schemaVersion: number;
  styles: Record<string, any>;
}

export interface FigmaComponent {
  key: string;
  name: string;
  description: string;
  type: string;
  styles?: any;
}

class FigmaClient {
  private accessToken: string | null = null;

  /**
   * Авторизация через OAuth
   */
  async authorize(code: string): Promise<string> {
    try {
      const response = await fetch('https://www.figma.com/api/oauth/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          client_id: FIGMA_CLIENT_ID,
          client_secret: FIGMA_CLIENT_SECRET,
          redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
          code: code,
          grant_type: 'authorization_code'
        })
      });

      const data = await response.json();
      
      if (data.access_token) {
        this.accessToken = data.access_token;
        return data.access_token;
      } else {
        throw new Error('Failed to get access token');
      }
    } catch (error) {
      console.error('Figma authorization error:', error);
      throw error;
    }
  }

  /**
   * Получить файл из Figma
   */
  async getFile(fileKey: string): Promise<FigmaFile> {
    if (!this.accessToken) {
      throw new Error('Not authorized. Call authorize() first.');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching Figma file:', error);
      throw error;
    }
  }

  /**
   * Получить компоненты из файла
   */
  async getComponents(fileKey: string): Promise<FigmaComponent[]> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/components`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return Object.values(data.meta?.components || {});
    } catch (error) {
      console.error('Error fetching components:', error);
      throw error;
    }
  }

  /**
   * Экспорт изображений из Figma
   */
  async exportImages(
    fileKey: string,
    nodeIds: string[],
    format: 'png' | 'jpg' | 'svg' = 'png',
    scale: number = 2
  ): Promise<Record<string, string>> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const params = new URLSearchParams({
        ids: nodeIds.join(','),
        format,
        scale: scale.toString()
      });

      const response = await fetch(
        `${FIGMA_API_BASE}/images/${fileKey}?${params}`,
        {
          headers: {
            'X-Figma-Token': this.accessToken
          }
        }
      );

      const data = await response.json();
      return data.images || {};
    } catch (error) {
      console.error('Error exporting images:', error);
      throw error;
    }
  }

  /**
   * Получить стили из файла
   */
  async getStyles(fileKey: string): Promise<any> {
    if (!this.accessToken) {
      throw new Error('Not authorized');
    }

    try {
      const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}/styles`, {
        headers: {
          'X-Figma-Token': this.accessToken
        }
      });

      const data = await response.json();
      return data.meta?.styles || {};
    } catch (error) {
      console.error('Error fetching styles:', error);
      throw error;
    }
  }

  /**
   * Конвертировать Figma цвета в CSS
   */
  figmaColorToCSS(color: { r: number; g: number; b: number; a: number }): string {
    const r = Math.round(color.r * 255);
    const g = Math.round(color.g * 255);
    const b = Math.round(color.b * 255);
    const a = color.a;

    if (a === 1) {
      return `rgb(${r}, ${g}, ${b})`;
    } else {
      return `rgba(${r}, ${g}, ${b}, ${a})`;
    }
  }

  /**
   * Генерация URL для авторизации
   */
  getAuthUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: FIGMA_CLIENT_ID,
      redirect_uri: `${process.env.NEXT_PUBLIC_API_URL}/api/figma/callback`,
      scope: 'file_read',
      state: state || 'random_state',
      response_type: 'code'
    });

    return `https://www.figma.com/oauth?${params}`;
  }
}

// Singleton instance
export const figmaClient = new FigmaClient();

// Helper для прямого доступа с Personal Access Token
export async function getFigmaFileWithToken(fileKey: string, token: string): Promise<FigmaFile> {
  const response = await fetch(`${FIGMA_API_BASE}/files/${fileKey}`, {
    headers: {
      'X-Figma-Token': token
    }
  });

  return await response.json();
}





























