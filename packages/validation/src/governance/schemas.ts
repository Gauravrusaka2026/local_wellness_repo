import {
  governanceDatasetDispositions,
  governanceDatasetIds,
  type GovernanceImportManifest,
} from '@local-wellness/types';
import { z } from 'zod';

const sha256Schema = z.string().regex(/^[0-9a-f]{64}$/u, 'Expected a lowercase SHA-256 digest.');
const repositoryPathSchema = z
  .string()
  .min(1)
  .refine((value) => !value.startsWith('/') && !value.split('/').includes('..'), {
    message: 'Expected a repository-relative path without parent traversal.',
  });

const datasetSchema = z
  .object({
    id: z.enum(governanceDatasetIds),
    path: repositoryPathSchema,
    sha256: sha256Schema,
    title: z.string().min(1),
    headers: z.array(z.string()).min(1),
    expectedRecordCount: z.number().int().nonnegative(),
    naturalKey: z.array(z.string().min(1)).min(1),
    disposition: z.enum(governanceDatasetDispositions),
  })
  .strict()
  .superRefine(({ headers, id, naturalKey }, context) => {
    if (id === 'readme') {
      if (naturalKey.length !== 1 || naturalKey[0] !== 'metadata_key') {
        context.addIssue({
          code: 'custom',
          message: 'README metadata must use metadata_key as its natural key.',
          path: ['naturalKey'],
        });
      }
      return;
    }

    for (const field of naturalKey) {
      if (!headers.includes(field)) {
        context.addIssue({
          code: 'custom',
          message: `Natural-key field ${field} is not present in headers.`,
          path: ['naturalKey'],
        });
      }
    }
  });

export const governanceManifestSchema: z.ZodType<GovernanceImportManifest> = z
  .object({
    schemaVersion: z.literal(1),
    datasetVersion: z.string().regex(/^[A-Za-z0-9_.-]+$/u),
    generatedOn: z.iso.date(),
    workbook: z
      .object({
        path: repositoryPathSchema,
        sha256: sha256Schema,
        role: z.literal('human_reference'),
      })
      .strict(),
    expectedRawRecordCount: z.number().int().nonnegative(),
    expectedMetadataRecordCount: z.number().int().nonnegative(),
    aliases: z
      .object({
        localBodies: z.record(z.string().min(1), z.string().min(1)),
      })
      .strict(),
    multiDistrictLocalBodies: z.record(z.string().min(1), z.array(z.string().min(1)).min(2)),
    datasets: z.array(datasetSchema).length(governanceDatasetIds.length),
  })
  .strict()
  .superRefine(({ datasets }, context) => {
    const ids = new Set<string>();
    const paths = new Set<string>();

    for (const [index, dataset] of datasets.entries()) {
      if (ids.has(dataset.id)) {
        context.addIssue({
          code: 'custom',
          message: `Dataset ${dataset.id} appears more than once.`,
          path: ['datasets', index, 'id'],
        });
      }
      ids.add(dataset.id);

      if (paths.has(dataset.path)) {
        context.addIssue({
          code: 'custom',
          message: `Source path ${dataset.path} appears more than once.`,
          path: ['datasets', index, 'path'],
        });
      }
      paths.add(dataset.path);
    }

    for (const requiredId of governanceDatasetIds) {
      if (!ids.has(requiredId)) {
        context.addIssue({
          code: 'custom',
          message: `Dataset ${requiredId} is missing.`,
          path: ['datasets'],
        });
      }
    }
  });

export const governanceDateSchema = z.iso.date();
export const governanceHttpsUrlSchema = z.url().refine((value) => value.startsWith('https://'), {
  message: 'Governance source URLs must use HTTPS.',
});
