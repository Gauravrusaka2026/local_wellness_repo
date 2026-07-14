import { createHash } from 'node:crypto';

import { Inject, Injectable } from '@nestjs/common';

import {
  ResolutionEvidenceGateway,
  ResolutionEvidenceGatewayError,
  ResolutionEvidenceIntegrityError,
  type ResolutionEvidenceObject,
  type ResolutionEvidenceReadTarget,
  type ResolutionEvidenceUploadTarget,
} from '../data/resolution-evidence.gateway.js';
import { SupabaseClients } from './supabase-clients.js';

const maximumVerifiedObjectBytes = 50 * 1_024 * 1_024;
const maximumFtypBoxBytes = 4_096;
const maximumCompatibleBrands = 256;
const webmDocumentType = Buffer.from([0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]);

const acceptedEvidenceMimeTypes = new Set([
  'image/heic',
  'image/heif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
]);

const heicBrands = new Set(['heic', 'heix', 'hevc', 'hevx', 'heim', 'heis', 'hevm', 'hevs']);
const heifBrands = new Set(['mif1', 'msf1']);
const mp4Brands = new Set([
  'isom',
  'iso2',
  'iso3',
  'iso4',
  'iso5',
  'iso6',
  'iso7',
  'iso8',
  'iso9',
  'mp41',
  'mp42',
  'avc1',
  'dash',
  'M4V ',
  'F4V ',
  'MSNV',
]);

const beginsWith = (bytes: Buffer, signature: readonly number[]): boolean =>
  bytes.length >= signature.length && signature.every((value, index) => bytes[index] === value);

const normalizeContentType = (contentType: string): string | null => {
  const normalized = contentType.split(';', 1)[0]?.trim().toLowerCase();
  return normalized && acceptedEvidenceMimeTypes.has(normalized) ? normalized : null;
};

const readIsoBaseMediaBrands = (bytes: Buffer): string[] | null => {
  if (bytes.length < 16 || bytes.toString('ascii', 4, 8) !== 'ftyp') return null;

  const size32 = bytes.readUInt32BE(0);
  let boxSize: number;
  let majorBrandOffset: number;

  if (size32 === 1) {
    if (bytes.length < 24) return null;
    const extendedSize = bytes.readBigUInt64BE(8);
    if (extendedSize > BigInt(Number.MAX_SAFE_INTEGER)) return null;
    boxSize = Number(extendedSize);
    majorBrandOffset = 16;
  } else {
    boxSize = size32 === 0 ? bytes.length : size32;
    majorBrandOffset = 8;
  }

  const compatibleBrandOffset = majorBrandOffset + 8;
  if (
    boxSize < compatibleBrandOffset ||
    boxSize > bytes.length ||
    boxSize > maximumFtypBoxBytes ||
    (boxSize - compatibleBrandOffset) / 4 > maximumCompatibleBrands ||
    (boxSize - compatibleBrandOffset) % 4 !== 0
  ) {
    return null;
  }

  const brands = [bytes.toString('ascii', majorBrandOffset, majorBrandOffset + 4)];
  for (let offset = compatibleBrandOffset; offset < boxSize; offset += 4) {
    brands.push(bytes.toString('ascii', offset, offset + 4));
  }
  return brands;
};

const detectIsoBaseMediaMimeType = (bytes: Buffer): string | null => {
  const brands = readIsoBaseMediaBrands(bytes);
  if (!brands) return null;

  const majorBrand = brands[0];
  if (!majorBrand) return null;

  if (heicBrands.has(majorBrand)) return 'image/heic';
  if (heifBrands.has(majorBrand)) {
    return brands.some((brand) => heicBrands.has(brand)) ? 'image/heic' : 'image/heif';
  }
  if (majorBrand === 'qt  ') return 'video/quicktime';
  if (mp4Brands.has(majorBrand)) return 'video/mp4';
  return null;
};

const detectEvidenceMimeType = (bytes: Buffer): string | null => {
  if (beginsWith(bytes, [0xff, 0xd8, 0xff])) return 'image/jpeg';
  if (beginsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return 'image/png';
  }
  if (
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.readUInt32LE(4) === bytes.length - 8 &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  ) {
    return 'image/webp';
  }
  if (
    beginsWith(bytes, [0x1a, 0x45, 0xdf, 0xa3]) &&
    bytes.subarray(4, Math.min(bytes.length, 4096)).indexOf(webmDocumentType) !== -1
  ) {
    return 'video/webm';
  }
  return detectIsoBaseMediaMimeType(bytes);
};

@Injectable()
export class SupabaseResolutionEvidenceGateway extends ResolutionEvidenceGateway {
  public constructor(
    @Inject(SupabaseClients)
    private readonly clients: SupabaseClients,
  ) {
    super();
  }

  public async createSignedUploadTarget(
    bucket: string,
    objectPath: string,
  ): Promise<ResolutionEvidenceUploadTarget> {
    const { data, error } = await this.clients.serviceRoleClient.storage
      .from(bucket)
      .createSignedUploadUrl(objectPath, { upsert: false });

    if (error || data.path !== objectPath) {
      throw new ResolutionEvidenceGatewayError('create signed upload target');
    }

    return { objectPath: data.path, token: data.token };
  }

  public async createSignedReadTarget(
    bucket: string,
    objectPath: string,
    expiresInSeconds: number,
  ): Promise<ResolutionEvidenceReadTarget> {
    const { data, error } = await this.clients.serviceRoleClient.storage
      .from(bucket)
      .createSignedUrl(objectPath, expiresInSeconds, { download: true });

    if (error || !data.signedUrl) {
      throw new ResolutionEvidenceGatewayError('create signed read target');
    }

    return { signedUrl: data.signedUrl };
  }

  public async inspectObject(
    bucket: string,
    objectPath: string,
  ): Promise<ResolutionEvidenceObject> {
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
      throw new ResolutionEvidenceGatewayError('inspect uploaded object');
    }

    const downloadResult = await storage.download(objectPath);
    if (downloadResult.error) {
      throw new ResolutionEvidenceGatewayError(
        'download uploaded object for checksum verification',
      );
    }

    const bytes = Buffer.from(await downloadResult.data.arrayBuffer());
    if (bytes.byteLength !== objectSize) {
      throw new ResolutionEvidenceIntegrityError('verify uploaded object size');
    }

    const storageMimeType = normalizeContentType(infoResult.data.contentType);
    const detectedMimeType = detectEvidenceMimeType(bytes);
    if (!storageMimeType || !detectedMimeType || storageMimeType !== detectedMimeType) {
      throw new ResolutionEvidenceIntegrityError('verify uploaded object content type');
    }

    return {
      byteSize: bytes.byteLength,
      mimeType: detectedMimeType,
      sha256: createHash('sha256').update(bytes).digest('hex'),
    };
  }

  public async removeObject(bucket: string, objectPath: string): Promise<void> {
    const { data, error } = await this.clients.serviceRoleClient.storage
      .from(bucket)
      .remove([objectPath]);

    if (error || data.length !== 1 || data[0]?.name !== objectPath) {
      throw new ResolutionEvidenceGatewayError('remove uploaded object');
    }
  }
}
