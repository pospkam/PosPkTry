/**
 * hooks/useAIStream.ts
 * 
 * Hook for consuming Server-Sent Events from /api/ai/chat-stream
 * Streams tokens and builds response in real-time
 * 
 * Usage:
 *   const { stream, loading, error } = useAIStream();
 *   await stream(message, sessionId);
 */

import { useCallback, useRef, useState } from 'react';

interface StreamOptions {
  sessionId?: string;
  role?: 'tourist' | 'operator' | 'agent';
  onToken?: (token: string) => void; // Called on each token
  onStart?: () => void;
  onEnd?: (finalResponse: string) => void;
  onError?: (error: string) => void;
}

interface StreamState {
  loading: boolean;
  error: string | null;
  currentText: string;
}

export function useAIStream() {
  const [state, setState] = useState<StreamState>({
    loading: false,
    error: null,
    currentText: '',
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const stream = useCallback(
    async (message: string, options: StreamOptions = {}) => {
      // Prevent multiple concurrent streams
      if (state.loading) return;

      setState({ loading: true, error: null, currentText: '' });
      options.onStart?.();

      const abortController = new AbortController();
      abortControllerRef.current = abortController;

      try {
        const response = await fetch('/api/ai/chat-stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId: options.sessionId,
            role: options.role ?? 'tourist',
          }),
          signal: abortController.signal,
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No readable stream');
        }

        const decoder = new TextDecoder();
        let buffer = '';
        let finalResponse = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Parse SSE events (data: {...}\n\n)
          const lines = buffer.split('\n');
          buffer = lines[lines.length - 1]; // Keep incomplete line

          for (const line of lines.slice(0, -1)) {
            if (!line.startsWith('data: ')) continue;

            try {
              const json = JSON.parse(line.slice(6));

              if (json.type === 'start') {
                // Stream started
              } else if (json.type === 'token' && json.content) {
                // New token received
                const token = json.content;
                options.onToken?.(token);
                setState(prev => ({
                  ...prev,
                  currentText: prev.currentText + token,
                }));
              } else if (json.type === 'end') {
                // Stream ended
                finalResponse = json.finalResponse || '';
                if (finalResponse) {
                  setState(prev => ({ ...prev, currentText: finalResponse }));
                }
                options.onEnd?.(finalResponse);
              }
            } catch {
              // Skip invalid JSON lines
            }
          }
        }

        // Ensure we have the final response
        if (!finalResponse && state.currentText) {
          finalResponse = state.currentText;
          options.onEnd?.(finalResponse);
        }

        setState(prev => ({ ...prev, loading: false }));
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          // User cancelled the stream
          setState(prev => ({ ...prev, loading: false }));
        } else {
          const errorMsg = error instanceof Error ? error.message : 'Unknown error';
          setState(prev => ({
            ...prev,
            loading: false,
            error: errorMsg,
          }));
          options.onError?.(errorMsg);
        }
      } finally {
        abortControllerRef.current = null;
      }
    },
    [state.loading, state.currentText]
  );

  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  return {
    stream,
    cancel,
    loading: state.loading,
    error: state.error,
    text: state.currentText,
  };
}
