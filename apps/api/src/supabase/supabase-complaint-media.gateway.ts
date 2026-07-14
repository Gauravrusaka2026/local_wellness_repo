import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  ComplaintMediaGateway,
  ComplaintMediaGatewayError,
  type ComplaintMediaObject,
  type ComplaintMediaUploadTarget,
} from '../data/complaint-media.gateway.js';
import { SupabaseClients } from './supabase-clients.js';

const maximumVerifiedObjectBytes = 50 * 1_024 * 1_024;

@Injectable()
export class SupabaseComplaintMediaGateway extends ComplaintMediaGateway {
  public constructor(
    @Inject(SupabaseClients)
    private readonly clients: SupabaseClients,
  ) {
    super();
  }

  public async createSignedUploadTarget(
    bucket: string,
    objectPath: string,
  ): Promise<ComplaintMediaUploadTarget> {
    const { data, error } = await this.clients.serviceRoleClient.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath, { upsert: false });

    if (error || data.path !== objectPath) {
      throw new ComplaintMediaGatewayError('create signed upload target');
    }

    return {
      objectPath: data.path,
      token: data.token,
    };
  }

  public async inspectObject(bucket: string, objectPath: string): Promise<ComplaintMediaObject> {
    const storage = this.clients.serviceRoleClient.storage.from(bucket);
    const infoResult = await storage.info(objectPath);
    const objectSize = infoResult.data?.size;

    if (
      infoResult.error ||
      typeof objectSize !== 'number' ||
      !Number.isSafeInteger(objectSize) ||
      objectSize <= 0 ||
      objectSize > maximumVerifiedObjectBytes ||
      typeof infoResult.data.contentType !== 'string'
    ) {
      throw new ComplaintMediaGatewayError('inspect uploaded object');
    }

    const downloadResult = await storage.download(objectPath);
    if (downloadResult.error) {
      throw new ComplaintMediaGatewayError('download uploaded object for checksum verification');
    }

    const bytes = Buffer.from(await downloadResult.data.arrayBuffer());
    if (bytes.byteLength !== objectSize) {
      throw new ComplaintMediaGatewayError('verify uploaded object size');
    }

    return {
      byteSize: bytes.byteLength,
      mimeType: infoResult.data.contentType,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }

  public async removeObject(bucket: string, objectPath: string): Promise<void> {
    const { data, error } = await this.clients.serviceRoleClient.storage
      .from(bucket)
      .remove([objectPath]);

    if (error || data.length !== 1 || data[0]?.name !== objectPath) {
      throw new ComplaintMediaGatewayError('remove uploaded object');
    }
  }
}
