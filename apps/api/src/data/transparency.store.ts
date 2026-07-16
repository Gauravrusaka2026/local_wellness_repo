import type {
  PublicComplaintDetail,
  PublicComplaintHotspotQuery,
  PublicComplaintHotspotResult,
  PublicComplaintMapQuery,
  PublicComplaintMapResult,
  PublicWardBoundaryQuery,
  PublicWardBoundaryResult,
} from '@local-wellness/types';

export class TransparencyDataAccessError extends Error {
  public constructor(operation: string) {
    super(`Public transparency persistence operation failed: ${operation}.`);
    this.name = 'TransparencyDataAccessError';
  }
}

export abstract class TransparencyStore {
  public abstract listComplaints(query: PublicComplaintMapQuery): Promise<PublicComplaintMapResult>;

  public abstract listHotspots(
    query: PublicComplaintHotspotQuery,
  ): Promise<PublicComplaintHotspotResult>;

  public abstract listWards(query: PublicWardBoundaryQuery): Promise<PublicWardBoundaryResult>;

  public abstract getComplaint(publicId: string): Promise<PublicComplaintDetail | null>;
}
