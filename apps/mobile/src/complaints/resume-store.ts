import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import {
  decodePendingMediaResume,
  isComplaintCaptureStep,
  serializePendingMediaResume,
  type ComplaintResumeRecord,
} from './resume-record';

type ResumeRow = Readonly<{
  create_idempotency_key: string;
  draft_id: string | null;
  owner_user_id: string;
  pending_media_json: string | null;
  step: string;
  submit_idempotency_key: string;
  updated_at: string;
}>;

let databasePromise: Promise<SQLiteDatabase> | undefined;

const getDatabase = async (): Promise<SQLiteDatabase> => {
  databasePromise ??= openDatabaseAsync('local-wellness-resume.db').then(async (database) => {
    await database.execAsync(`
      pragma journal_mode = WAL;
      create table if not exists complaint_resume (
        owner_user_id text primary key not null,
        draft_id text,
        create_idempotency_key text not null,
        submit_idempotency_key text not null,
        step text not null,
        pending_media_json text,
        updated_at text not null
      );
    `);
    return database;
  });

  return databasePromise;
};

export const saveComplaintResume = async (record: ComplaintResumeRecord): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync(
    `insert into complaint_resume (
      owner_user_id, draft_id, create_idempotency_key, submit_idempotency_key,
      step, pending_media_json, updated_at
    ) values (?, ?, ?, ?, ?, ?, ?)
    on conflict(owner_user_id) do update set
      draft_id = excluded.draft_id,
      create_idempotency_key = excluded.create_idempotency_key,
      submit_idempotency_key = excluded.submit_idempotency_key,
      step = excluded.step,
      pending_media_json = excluded.pending_media_json,
      updated_at = excluded.updated_at`,
    record.ownerUserId,
    record.draftId,
    record.createIdempotencyKey,
    record.submitIdempotencyKey,
    record.step,
    record.pendingMedia === null ? null : serializePendingMediaResume(record.pendingMedia),
    record.updatedAt,
  );
};

export const loadComplaintResume = async (
  ownerUserId: string,
): Promise<ComplaintResumeRecord | null> => {
  const database = await getDatabase();
  const row = await database.getFirstAsync<ResumeRow>(
    `select owner_user_id, draft_id, create_idempotency_key, submit_idempotency_key,
      step, pending_media_json, updated_at
    from complaint_resume where owner_user_id = ?`,
    ownerUserId,
  );
  if (row === null || !isComplaintCaptureStep(row.step)) return null;

  let pendingMedia = null;
  if (row.pending_media_json !== null) {
    try {
      pendingMedia = decodePendingMediaResume(JSON.parse(row.pending_media_json));
    } catch {
      pendingMedia = null;
    }
  }

  return {
    createIdempotencyKey: row.create_idempotency_key,
    draftId: row.draft_id,
    ownerUserId: row.owner_user_id,
    pendingMedia,
    step: row.step,
    submitIdempotencyKey: row.submit_idempotency_key,
    updatedAt: row.updated_at,
  };
};

export const clearComplaintResume = async (ownerUserId: string): Promise<void> => {
  const database = await getDatabase();
  await database.runAsync('delete from complaint_resume where owner_user_id = ?', ownerUserId);
};
