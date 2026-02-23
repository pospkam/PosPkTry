declare module "@sentry/nextjs" {
  interface SentryScope {
    setTag(key: string, value: string): void;
    setExtra(key: string, extra: unknown): void;
    setLevel(level: string): void;
    setUser(user: Record<string, unknown> | null): void;
    setContext(name: string, context: Record<string, unknown>): void;
  }
  interface Transaction {
    finish(): void;
    setData(key: string, value: unknown): void;
    setTag(key: string, value: string): void;
  }
  export const captureException: (err: unknown, opts?: Record<string, unknown>) => string;
  export const captureMessage: (message: string, level?: string) => string;
  export const withScope: (callback: (scope: SentryScope) => void) => void;
  export const setTag: (key: string, value: string) => void;
  export const setUser: (user: Record<string, unknown> | null) => void;
  export const setContext: (name: string, context: Record<string, unknown>) => void;
  export const init: (options: Record<string, unknown>) => void;
  export const flush: (timeout?: number) => Promise<boolean>;
  export const addBreadcrumb: (breadcrumb: Record<string, unknown>) => void;
  export const startTransaction: (context: Record<string, unknown>) => Transaction;
}
