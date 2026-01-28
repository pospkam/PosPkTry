/**
 * EventBusService - Управление событиями в системе
 */
export interface EventListener<T = any> {
  (event: T): void | Promise<void>
}

export class EventBusService {
  private static instance: EventBusService
  private listeners: Map<string, EventListener[]> = new Map()

  private constructor() {}

  static getInstance(): EventBusService {
    if (!EventBusService.instance) {
      EventBusService.instance = new EventBusService()
    }
    return EventBusService.instance
  }

  on<T = any>(eventName: string, listener: EventListener<T>): void {
    if (!this.listeners.has(eventName)) {
      this.listeners.set(eventName, [])
    }
    this.listeners.get(eventName)?.push(listener)
  }

  off<T = any>(eventName: string, listener: EventListener<T>): void {
    if (!this.listeners.has(eventName)) return
    const listeners = this.listeners.get(eventName) || []
    const index = listeners.indexOf(listener)
    if (index > -1) {
      listeners.splice(index, 1)
    }
  }

  async emit<T = any>(eventName: string, data?: T): Promise<void> {
    const listeners = this.listeners.get(eventName) || []
    await Promise.all(listeners.map((listener) => listener(data)))
  }

  once<T = any>(eventName: string, listener: EventListener<T>): void {
    const wrapper: EventListener<T> = (event: T) => {
      listener(event)
      this.off(eventName, wrapper)
    }
    this.on(eventName, wrapper)
  }

  clear(eventName?: string): void {
    if (eventName) {
      this.listeners.delete(eventName)
    } else {
      this.listeners.clear()
    }
  }
}

export const eventBusService = EventBusService.getInstance()
