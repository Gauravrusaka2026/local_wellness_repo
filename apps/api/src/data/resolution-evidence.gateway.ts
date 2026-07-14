export interface ResolutionEvidenceObject {
  byteSize: number;
  mimeType: string;
  sha256: string;
}

export interface ResolutionEvidenceUploadTarget {
  objectPath: string;
  token: string;
}

export interface ResolutionEvidenceReadTarget {
  signedUrl: string;
}

export class ResolutionEvidenceGatewayError extends Error {
  public constructor(operation: string) {
    super(`Resolution evidence storage operation failed: ${operation}.`);
    this.name = 'ResolutionEvidenceGatewayError';
  }
}

export class ResolutionEvidenceIntegrityError extends ResolutionEvidenceGatewayError {
  public constructor(operation: string) {
    super(operation);
    this.name = 'ResolutionEvidenceIntegrityError';
  }
}

export abstract class ResolutionEvidenceGateway {
  public abstract createSignedUploadTarget(
    bucket: string,
    objectPath: string,
  ): Promise<ResolutionEvidenceUploadTarget>;

  public abstract createSignedReadTarget(
    bucket: string,
    objectPath: string,
    expiresInSeconds: number,
  ): Promise<ResolutionEvidenceReadTarget>;

  public abstract inspectObject(
    bucket: string,
    objectPath: string,
  ): Promise<ResolutionEvidenceObject>;

  public abstract removeObject(bucket: string, objectPath: string): Promise<void>;
}
