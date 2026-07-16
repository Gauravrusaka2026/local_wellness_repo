export type WorkerLogFields = Readonly<
  Record<string, boolean | number | string | null | undefined>
>;

export interface WorkerLogger {
  error(event: string, fields?: WorkerLogFields): void;
  info(event: string, fields?: WorkerLogFields): void;
  warn(event: string, fields?: WorkerLogFields): void;
}

const write = (
  level: 'error' | 'info' | 'warn',
  event: string,
  fields: WorkerLogFields = {},
): void => {
  const payload = Object.fromEntries(
    Object.entries(fields).filter(([, value]) => value !== undefined),
  );
  process.stdout.write(
    `${JSON.stringify({
      level,
      event,
      service: 'local-wellness-workers',
      timestamp: new Date().toISOString(),
      ...payload,
    })}\n`,
  );
};

export class JsonWorkerLogger implements WorkerLogger {
  public error(event: string, fields?: WorkerLogFields): void {
    write('error', event, fields);
  }

  public info(event: string, fields?: WorkerLogFields): void {
    write('info', event, fields);
  }

  public warn(event: string, fields?: WorkerLogFields): void {
    write('warn', event, fields);
  }
}
