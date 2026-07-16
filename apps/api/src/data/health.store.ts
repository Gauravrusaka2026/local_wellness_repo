export class HealthDataAccessError extends Error {
  public constructor() {
    super('The API readiness dependency probe failed.');
    this.name = 'HealthDataAccessError';
  }
}

export abstract class HealthStore {
  public abstract isReady(): Promise<boolean>;
}
