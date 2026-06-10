import { defineConfig } from 'orval'

export default defineConfig({
  gsmApplication: {
    input: {
      target: './swagger/gsm-application.json',
    },
    output: {
      client:  'react-query',
      target:  './src/shared/api/application',
      schemas: './src/shared/api/application/model',
      mode:    'tags-split',
      override: {
        mutator: {
          path: './src/shared/lib/fetcher.ts',
          name: 'applicationFetch',
        },
      },
    },
  },
  gsmAuth: {
    input: {
      target: './swagger/gsm-auth.json',
    },
    output: {
      client:  'react-query',
      target:  './src/shared/api/auth',
      schemas: './src/shared/api/auth/model',
      mode:    'tags-split',
      override: {
        mutator: {
          path: './src/shared/lib/fetcher.ts',
          name: 'authFetch',
        },
      },
    },
  },
  gsmOperations: {
    input: {
      target: './swagger/gsm-operations.json',
      filters: {
        tags: ['Integrations', 'Operations'],
      },
    },
    output: {
      client:  'react-query',
      target:  './src/shared/api/operations',
      schemas: './src/shared/api/operations/model',
      mode:    'tags-split',
      override: {
        mutator: {
          path: './src/shared/lib/fetcher.ts',
          name: 'operationsFetch',
        },
      },
    },
  },
})