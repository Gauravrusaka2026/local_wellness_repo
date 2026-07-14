import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { describe, it } from 'node:test';

import { ResolutionEvidenceGatewayError } from '../data/resolution-evidence.gateway.js';
import { SupabaseClients } from '../supabase/supabase-clients.js';
import { SupabaseResolutionEvidenceGateway } from '../supabase/supabase-resolution-evidence.gateway.js';

interface SignedUrlCall {
  bucket: string;
  expiresInSeconds: number;
  objectPath: string;
  options: { download: boolean };
}

const createIsoBaseMediaFile = (majorBrand: string, compatibleBrands: string[] = []): Buffer => {
  const bytes = Buffer.alloc(16 + compatibleBrands.length * 4);
  bytes.writeUInt32BE(bytes.length, 0);
  bytes.write('ftyp', 4, 'ascii');
  bytes.write(majorBrand, 8, 'ascii');
  bytes.writeUInt32BE(0, 12);
  compatibleBrands.forEach((brand, index) => {
    bytes.write(brand, 16 + index * 4, 'ascii');
  });
  return bytes;
};

const createWebpFile = (): Buffer => {
  const bytes = Buffer.alloc(12);
  bytes.write('RIFF', 0, 'ascii');
  bytes.writeUInt32LE(bytes.length - 8, 4);
  bytes.write('WEBP', 8, 'ascii');
  return bytes;
};

const createGateway = (
  bytes: Buffer,
  contentType: string,
): Readonly<{
  gateway: SupabaseResolutionEvidenceGateway;
  signedUrlCalls: SignedUrlCall[];
}> => {
  const signedUrlCalls: SignedUrlCall[] = [];
  const clients = {
    serviceRoleClient: {
      storage: {
        from: (bucket: string) => ({
          createSignedUrl: async (
            objectPath: string,
            expiresInSeconds: number,
            options: { download: boolean },
          ) => {
            signedUrlCalls.push({ bucket, expiresInSeconds, objectPath, options });
            return { data: { signedUrl: 'https://storage.test/signed' }, error: null };
          },
          download: async () => ({
            data: new Blob([Uint8Array.from(bytes)]),
            error: null,
          }),
          info: async () => ({
            data: { contentType, size: bytes.byteLength },
            error: null,
          }),
        }),
      },
    },
  } as unknown as SupabaseClients;

  return {
    gateway: new SupabaseResolutionEvidenceGateway(clients),
    signedUrlCalls,
  };
};

const acceptedSignatures = [
  {
    bytes: Buffer.from([0xff, 0xd8, 0xff, 0xe0]),
    mimeType: 'image/jpeg',
  },
  {
    bytes: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    mimeType: 'image/png',
  },
  { bytes: createWebpFile(), mimeType: 'image/webp' },
  {
    bytes: createIsoBaseMediaFile('mif1', ['heic']),
    mimeType: 'image/heic',
  },
  {
    bytes: createIsoBaseMediaFile('mif1', ['msf1']),
    mimeType: 'image/heif',
  },
  {
    bytes: createIsoBaseMediaFile('isom', ['mp42']),
    mimeType: 'video/mp4',
  },
  {
    bytes: createIsoBaseMediaFile('qt  '),
    mimeType: 'video/quicktime',
  },
  {
    bytes: Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x42, 0x82, 0x84, 0x77, 0x65, 0x62, 0x6d]),
    mimeType: 'video/webm',
  },
] as const;

describe('SupabaseResolutionEvidenceGateway content integrity', () => {
  for (const fixture of acceptedSignatures) {
    it(`derives ${fixture.mimeType} from its accepted binary signature`, async () => {
      const { gateway } = createGateway(fixture.bytes, fixture.mimeType);

      const inspected = await gateway.inspectObject('resolution-evidence-private', 'object/path');

      assert.deepEqual(inspected, {
        byteSize: fixture.bytes.byteLength,
        mimeType: fixture.mimeType,
        sha256: createHash('sha256').update(fixture.bytes).digest('hex'),
      });
    });
  }

  it('rejects a Storage content type that does not match the binary signature', async () => {
    const { gateway } = createGateway(Buffer.from([0xff, 0xd8, 0xff, 0xe0]), 'image/png');

    await assert.rejects(
      gateway.inspectObject('resolution-evidence-private', 'object/path'),
      (error: unknown) =>
        error instanceof ResolutionEvidenceGatewayError &&
        error.message.includes('verify uploaded object content type'),
    );
  });

  it('rejects unsupported bytes even when Storage declares an accepted content type', async () => {
    const { gateway } = createGateway(Buffer.from('not-an-image'), 'image/jpeg');

    await assert.rejects(
      gateway.inspectObject('resolution-evidence-private', 'object/path'),
      (error: unknown) =>
        error instanceof ResolutionEvidenceGatewayError &&
        error.message.includes('verify uploaded object content type'),
    );
  });

  it('rejects an attacker-sized ftyp compatible-brand list without scanning or allocating it', async () => {
    const bytes = Buffer.alloc(4_100);
    bytes.writeUInt32BE(bytes.length, 0);
    bytes.write('ftyp', 4, 'ascii');
    bytes.write('isom', 8, 'ascii');
    const { gateway } = createGateway(bytes, 'video/mp4');

    await assert.rejects(
      gateway.inspectObject('resolution-evidence-private', 'object/path'),
      (error: unknown) =>
        error instanceof ResolutionEvidenceGatewayError &&
        error.message.includes('verify uploaded object content type'),
    );
  });

  it('forces signed evidence reads to download instead of rendering inline', async () => {
    const fixture = acceptedSignatures[0];
    const { gateway, signedUrlCalls } = createGateway(fixture.bytes, fixture.mimeType);

    const target = await gateway.createSignedReadTarget(
      'resolution-evidence-private',
      'complaint/evidence/original',
      60,
    );

    assert.deepEqual(target, { signedUrl: 'https://storage.test/signed' });
    assert.deepEqual(signedUrlCalls, [
      {
        bucket: 'resolution-evidence-private',
        expiresInSeconds: 60,
        objectPath: 'complaint/evidence/original',
        options: { download: true },
      },
    ]);
  });
});
