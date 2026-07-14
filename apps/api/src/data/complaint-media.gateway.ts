export interface ComplaintMediaObject {
  byteSize: number;
  mimeType: string;
  sha256: string;
}

export interface ComplaintMediaUploadTarget {
  objectPath: string;
  token: string;
}

export class ComplaintMediaGatewayError extends Error {
  public constructor(operation: string) {
    super(`Complaint media operation failed: ${operation}.`);
    this.name = 'ComplaintMediaGatewayError';
  }
}

export abstract class ComplaintMediaGateway {
  public abstract createSignedUploadTarget(
    bucket: string,
    objectPath: string,
  ): Promise<ComplaintMediaUploadTarget>;

  public abstract inspectObject(bucket: string, objectPath: string): Promise<ComplaintMediaObject>;

  public abstract removeObject(bucket: string, objectPath: string): Promise<void>;
}
