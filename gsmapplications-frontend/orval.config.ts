import { defineConfig } from 'orval'

export default defineConfig({
  gsmApplication: {
    input: {
      target: './swagger/gsm-application.json',
    },
    output: {
      client:  'react-query',
      target:  './src/shared/api/application/endpoints.ts',
      schemas: './src/shared/api/application/model',
      mode:    'split',
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
      target:  './src/shared/api/auth/endpoints.ts',
      schemas: './src/shared/api/auth/model',
      mode:    'split',
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
    },
    output: {
      client:  'react-query',
      target:  './src/shared/api/operations/endpoints.ts',
      schemas: './src/shared/api/operations/model',
      mode:    'split',
      override: {
        mutator: {
          path: './src/shared/lib/fetcher.ts',
          name: 'operationsFetch',
        },
      },
    },
  },
})