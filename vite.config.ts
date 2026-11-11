import { defineConfig } from 'vite';

const environment = (globalThis as typeof globalThis & { process?: { env?: Record<string, string | undefined> } }).process?.env;
const repositoryName = environment?.GITHUB_REPOSITORY?.split('/').pop();
const base = environment?.GITHUB_ACTIONS === 'true' && repositoryName && !repositoryName.endsWith('.github.io')
  ? `/${repositoryName}/`
  : '/';

export default defineConfig({ base });