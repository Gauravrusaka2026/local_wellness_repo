import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { extname, resolve } from 'node:path';
import test from 'node:test';

const repositoryRoot = resolve(import.meta.dirname, '..');
const clientApplicationDirectories = [
  'apps/mobile',
  'apps/citizen-web',
  'apps/government-dashboard',
  'apps/admin-console',
];
const forbiddenV1Dependencies = [
  '@sentry/node',
  '@sentry/nextjs',
  '@sentry/react-native',
  'bullmq',
  'redis',
];

const readSourceFiles = async (directory) => {
  const entries = await readdir(directory, { withFileTypes: true });
  const contents = [];

  for (const entry of entries) {
    if (entry.name === 'node_modules' || entry.name.startsWith('.next')) {
      continue;
    }

    const path = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      contents.push(...(await readSourceFiles(path)));
      continue;
    }

    if (['.js', '.mjs', '.ts', '.tsx', '.json'].includes(extname(entry.name))) {
      contents.push({ path, source: await readFile(path, 'utf8') });
    }
  }

  return contents;
};

test('server-only Supabase credentials are never referenced by client applications', async () => {
  for (const relativeDirectory of clientApplicationDirectories) {
    const files = await readSourceFiles(resolve(repositoryRoot, relativeDirectory));

    for (const file of files) {
      assert.doesNotMatch(
        file.source,
        /SUPABASE_(?:SERVICE_ROLE|SECRET)_KEY|service[_-]?role/i,
        `${file.path} references a server-only Supabase credential`,
      );
    }
  }
});

test('Redis, BullMQ, and Sentry are not active V1 workspace dependencies', async () => {
  const workspaceDirectories = ['apps', 'packages'];

  for (const workspaceDirectory of workspaceDirectories) {
    const entries = await readdir(resolve(repositoryRoot, workspaceDirectory), {
      withFileTypes: true,
    });

    for (const entry of entries.filter((candidate) => candidate.isDirectory())) {
      const manifestPath = resolve(repositoryRoot, workspaceDirectory, entry.name, 'package.json');
      const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
      const dependencies = {
        ...manifest.dependencies,
        ...manifest.devDependencies,
        ...manifest.optionalDependencies,
      };

      for (const dependencyName of forbiddenV1Dependencies) {
        assert.equal(
          dependencies[dependencyName],
          undefined,
          `${manifestPath} must not depend on deferred ${dependencyName}`,
        );
      }
    }
  }

  const composeSource = await readFile(
    resolve(repositoryRoot, 'infrastructure/docker/compose.dev.yml'),
    'utf8',
  );
  const environmentTemplate = await readFile(resolve(repositoryRoot, '.env.example'), 'utf8');

  assert.doesNotMatch(composeSource, /\bredis\b|bullmq|sentry/i);
  assert.doesNotMatch(environmentTemplate, /REDIS_|SENTRY_/);
});

test('government invitation emails use server-readable one-time token parameters', async () => {
  const authConfiguration = await readFile(resolve(repositoryRoot, 'supabase/config.toml'), 'utf8');
  const invitationTemplate = await readFile(
    resolve(repositoryRoot, 'supabase/templates/invite.html'),
    'utf8',
  );

  assert.match(authConfiguration, /\[auth\.email\.template\.invite\]/);
  assert.match(authConfiguration, /content_path = "\.\/supabase\/templates\/invite\.html"/);
  assert.match(
    invitationTemplate,
    /href="{{ \.RedirectTo }}\?token_hash={{ \.TokenHash }}&amp;type=invite"/,
  );
  assert.doesNotMatch(invitationTemplate, /\.ConfirmationURL/);
});
