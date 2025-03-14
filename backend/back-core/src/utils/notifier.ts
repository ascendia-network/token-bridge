import { EventEmitter } from "node:events";


class Notifier extends EventEmitter {
  newEvent(name: string, event: any) {
    this.emit(name, { eventName: name, event: event });
  }
}

export const notifier = new Notifier();
notifier.setMaxListeners(500);
