export class RoutingConfigurationError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = 'RoutingConfigurationError';
  }
}
