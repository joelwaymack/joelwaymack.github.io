import { defineConfig } from 'astro/config';

export default defineConfig({
  redirects: {
        '/running-scheduled-jobs-on-azure-functions': {
          status: 301,
            destination: '/blog/running-scheduled-jobs-on-azure-functions'
    }
  }
});