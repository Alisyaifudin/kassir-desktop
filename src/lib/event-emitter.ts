// eventEmitter.ts
type Listener = () => void;

class EventEmitter {
  private events: Record<string, Listener[]> = {};

  emit(event: string) {
    if (this.events[event]) {
      this.events[event].forEach((listener) => listener());
    }
  }

  on(event: string, listener: Listener) {
    if (!this.events[event]) this.events[event] = [];
    this.events[event].push(listener);
  }

  off(event: string, listener: Listener) {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter((l) => l !== listener);
  }
}

export const emitter = new EventEmitter();