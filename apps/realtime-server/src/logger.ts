type LogValue = boolean | number | string | null | undefined;
export type LogFields = Readonly<Record<string, LogValue>>;

export interface RealtimeLogger {
  error(event: string, fields?: LogFields): void;
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
}

const serialize = (level: 'error' | 'info' | 'warn', event: string, fields: LogFields): string =>
  JSON.stringify({
    event,
    level,
    timestamp: new Date().toISOString(),
    ...Object.fromEntries(Object.entries(fields).filter(([, value]) => value !== undefined)),
  });

export class ConsoleRealtimeLogger implements RealtimeLogger {
  public error(event: string, fields: LogFields = {}): void {
    console.error(serialize('error', event, fields));
  }

  public info(event: string, fields: LogFields = {}): void {
    console.info(serialize('info', event, fields));
  }

  public warn(event: string, fields: LogFields = {}): void {
    console.warn(serialize('warn', event, fields));
  }
}
