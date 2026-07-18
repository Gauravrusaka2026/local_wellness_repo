import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type {
  PublicComplaintDetail,
  PublicComplaintEngagementState,
  PublicComplaintHotspotQuery,
  PublicComplaintHotspotResult,
  PublicComplaintMapQuery,
  PublicComplaintMapResult,
  PublicWardBoundaryQuery,
  PublicWardBoundaryResult,
} from '@local-wellness/types';
import request from 'supertest';

import { configureApiApplication } from '../application.js';
import { stripQueryString } from '../common/api-exception.filter.js';
import { RequestIdMiddleware } from '../common/request-id.middleware.js';
import { API_CONFIGURATION } from '../configuration.js';
import { TransparencyStore } from '../data/transparency.store.js';
import { TransparencyController } from '../transparency/transparency.controller.js';
import { TransparencyService } from '../transparency/transparency.service.js';
import { apiConfiguration } from './test-doubles.js';

const identifiers = {
  categoryCode: 'pothole',
  localBodyCode: '251528',
  publicComplaint: '30000000-0000-4000-8000-000000000003',
  relatedPublicComplaint: '30000000-0000-4000-8000-000000000004',
  wardCode: 'PMC-WARD-1',
} as const;

const complaint: PublicComplaintDetail = {
  publicId: identifiers.publicComplaint,
  title: 'Reviewed public title',
  category: { code: identifiers.categoryCode, name: 'Pothole' },
  status: 'in_progress',
  location: { latitude: 18.52, longitude: 73.86, precisionMeters: 500 },
  localBody: { code: identifiers.localBodyCode, name: 'Test Municipal Corporation' },
  ward: { code: identifiers.wardCode, name: 'Ward 1', wardNumber: '1' },
  submittedAt: '2026-07-16T08:00:00.000Z',
  updatedAt: '2026-07-16T09:00:00.000Z',
  publishedAt: '2026-07-16T08:05:00.000Z',
  supportCount: 7,
  summary: 'A reviewed, data-minimized public summary.',
  duplicateGroup: {
    canonicalPublicId: identifiers.publicComplaint,
    relatedPublicIds: [identifiers.relatedPublicComplaint],
    totalCount: 2,
  },
};

class FakeTransparencyStore extends TransparencyStore {
  public complaint: PublicComplaintDetail | null = complaint;
  public complaintQuery: PublicComplaintMapQuery | null = null;
  public hotspotQuery: PublicComplaintHotspotQuery | null = null;
  public wardQuery: PublicWardBoundaryQuery | null = null;

  public async listComplaints(query: PublicComplaintMapQuery): Promise<PublicComplaintMapResult> {
    this.complaintQuery = query;
    const { duplicateGroup, summary, ...item } = complaint;
    void duplicateGroup;
    void summary;
    return { items: [item], nextCursor: null, hasMore: false };
  }

  public async listHotspots(
    query: PublicComplaintHotspotQuery,
  ): Promise<PublicComplaintHotspotResult> {
    this.hotspotQuery = query;
    return { items: [] };
  }

  public async listWards(query: PublicWardBoundaryQuery): Promise<PublicWardBoundaryResult> {
    this.wardQuery = query;
    return { items: [] };
  }

  public async getComplaint(publicId: string): Promise<PublicComplaintDetail | null> {
    return this.complaint?.publicId === publicId ? this.complaint : null;
  }

  public async listEngagements(
    _actorUserId: string,
    publicIds: readonly string[],
  ): Promise<PublicComplaintEngagementState[]> {
    return publicIds.map((publicId) => ({
      publicId,
      starred: false,
      supportCount: complaint.supportCount,
      supported: false,
    }));
  }

  public async setEngagement(
    _actorUserId: string,
    publicId: string,
    input: Readonly<{ supported: boolean; starred: boolean }>,
  ): Promise<PublicComplaintEngagementState | null> {
    return {
      publicId,
      starred: input.starred,
      supportCount: complaint.supportCount + (input.supported ? 1 : 0),
      supported: input.supported,
    };
  }
}

describe('anonymous transparency API', () => {
  let application: INestApplication;
  let store: FakeTransparencyStore;

  beforeEach(async () => {
    store = new FakeTransparencyStore();
    const testingModule = await Test.createTestingModule({
      controllers: [TransparencyController],
      providers: [
        TransparencyService,
        RequestIdMiddleware,
        { provide: API_CONFIGURATION, useValue: apiConfiguration },
        { provide: TransparencyStore, useValue: store },
      ],
    }).compile();

    application = testingModule.createNestApplication();
    configureApiApplication(application);
    await application.listen(0, '127.0.0.1');
  });

  afterEach(async () => {
    await application.close();
  });

  it('serves bounded public projections without a bearer token', async () => {
    const response = await request(application.getHttpServer())
      .get('/api/v1/transparency/complaints')
      .query({
        west: '73.7',
        south: '18.4',
        east: '73.9',
        north: '18.7',
        categoryCodes: identifiers.categoryCode,
        statuses: 'reported,in_progress',
        limit: '25',
      })
      .expect(200);

    assert.equal(response.headers['cache-control'], 'no-store');
    assert.equal(response.body.data.items[0].publicId, identifiers.publicComplaint);
    assert.equal(response.body.data.items[0].summary, undefined);
    assert.equal(response.body.data.items[0].citizenUserId, undefined);
    assert.deepEqual(store.complaintQuery, {
      west: 73.7,
      south: 18.4,
      east: 73.9,
      north: 18.7,
      categoryCodes: [identifiers.categoryCode],
      statuses: ['reported', 'in_progress'],
      zoom: 12,
      limit: 25,
      sort: 'recent',
    });
  });

  it('serves public detail and makes unpublished records indistinguishable from missing ones', async () => {
    const response = await request(application.getHttpServer())
      .get(`/api/v1/transparency/complaints/${identifiers.publicComplaint}`)
      .expect(200);

    assert.equal(response.body.data.summary, complaint.summary);
    assert.equal(response.body.data.location.precisionMeters, 500);
    assert.deepEqual(response.body.data.duplicateGroup, complaint.duplicateGroup);
    assert.equal(response.body.data.duplicateGroup.groupId, undefined);
    assert.equal(response.body.data.duplicateGroup.complaintIds, undefined);
    assert.equal(response.body.data.duplicateGroup.localBodyId, undefined);

    store.complaint = null;
    const missing = await request(application.getHttpServer())
      .get(`/api/v1/transparency/complaints/${identifiers.publicComplaint}`)
      .expect(404);
    assert.equal(missing.body.error.code, 'PUBLIC_COMPLAINT_NOT_FOUND');
  });

  it('serves empty hotspot and ward collections without requiring identity', async () => {
    const viewport = { west: 73.7, south: 18.4, east: 73.9, north: 18.7 };
    const [hotspots, wards] = await Promise.all([
      request(application.getHttpServer())
        .get('/api/v1/transparency/hotspots')
        .query(viewport)
        .expect(200),
      request(application.getHttpServer())
        .get('/api/v1/transparency/wards')
        .query(viewport)
        .expect(200),
    ]);

    assert.deepEqual(hotspots.body.data, { items: [] });
    assert.deepEqual(wards.body.data, { items: [] });
    assert.equal(store.hotspotQuery?.zoom, 12);
    assert.equal(store.wardQuery?.limit, 100);
  });

  it('rejects absent, reversed, oversized, and unknown viewport input before persistence', async () => {
    await request(application.getHttpServer()).get('/api/v1/transparency/complaints').expect(400);
    await request(application.getHttpServer())
      .get('/api/v1/transparency/complaints')
      .query({ west: 74, south: 18, east: 73, north: 19 })
      .expect(400);
    await request(application.getHttpServer())
      .get('/api/v1/transparency/complaints')
      .query({ west: 70, south: 18, east: 74, north: 19 })
      .expect(400);
    await request(application.getHttpServer())
      .get('/api/v1/transparency/complaints')
      .query({ west: 73, south: 18, east: 74, north: 19, exact: 'true' })
      .expect(400);

    assert.equal(store.complaintQuery, null);
  });

  it('fails closed when a store returns fields outside the reviewed public contract', async () => {
    store.complaint = {
      ...complaint,
      citizenUserId: 'private-user',
    } as PublicComplaintDetail;

    const response = await request(application.getHttpServer())
      .get(`/api/v1/transparency/complaints/${identifiers.publicComplaint}`)
      .expect(503);

    assert.equal(response.body.error.code, 'DEPENDENCY_UNAVAILABLE');
    assert.equal(
      response.body.error.message,
      'Public transparency data is temporarily unavailable.',
    );
    assert.equal(response.body.data, undefined);
  });
});

describe('API error log path privacy', () => {
  it('removes transparency viewport and filter queries from logged request paths', () => {
    assert.equal(
      stripQueryString(
        '/api/v1/transparency/complaints?west=73.7&south=18.4&categoryCodes=pothole',
      ),
      '/api/v1/transparency/complaints',
    );
  });
});
