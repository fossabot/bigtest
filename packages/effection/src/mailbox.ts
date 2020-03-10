import { Operation } from 'effection';
import { EventEmitter } from 'events';

import { compile } from './pattern';
export { any } from './pattern';
import { suspend } from './suspend';
import { ensure } from './ensure';

function isEventTarget(target): target is EventTarget { return typeof target.addEventListener === 'function'; }

export interface SubscriptionMessage {
  event: string,
  args: unknown[],
}

export class Mailbox<T = any> {
  private subscriptions = new EventEmitter();
  private messages = new Set<T>();

  static *subscribe(
    emitter: EventEmitter | EventTarget,
    events: string | string[],
  ): Operation<Mailbox<SubscriptionMessage>> {
    let mailbox: Mailbox<SubscriptionMessage> = new Mailbox();

    yield suspend(subscribe(mailbox, emitter, events));

    return mailbox;
  }

  send(message: T) {
    this.messages.add(message);
    this.subscriptions.emit('message', message);
  }

  receive(pattern: unknown = undefined): Operation<T> {
    let match = compile(pattern);

    return ({ resume, ensure }) => {
      let dispatch = (message: T) => {
        if (this.messages.has(message) && match(message)) {
          this.messages.delete(message);
          resume(message);
          return true;
        }
      }

      for (let message of this.messages) {
        if (dispatch(message)) {
          return;
        };
      }

      this.subscriptions.on('message', dispatch);
      ensure(() => this.subscriptions.off('message', dispatch));
    };
  }
}

export function *subscribe(
  mailbox: Mailbox<SubscriptionMessage>,
  emitter: EventEmitter | EventTarget,
  events: string | string[],
): Operation {
  for (let name of [].concat(events)) {
    let listener = (...args) => {
      mailbox.send({ event: name, args });
    }

    if(isEventTarget(emitter)) {
      emitter.addEventListener(name, listener);
      yield suspend(ensure(() => emitter.removeEventListener(name, listener)));
    } else {
      emitter.on(name, listener);
      yield suspend(ensure(() => emitter.off(name, listener)));
    }
  }
}
