// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/image',
    '@nuxt/ui',
    '@nuxt/content',
    'nuxt-og-image',
    'nuxt-llms'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  content: {
    build: {
      markdown: {
        toc: {
          searchDepth: 1
        }
      }
    },
    experimental: {
      sqliteConnector: 'native'
    }
  },

  experimental: {
    asyncContext: true
  },

  compatibilityDate: '2026-06-30',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  },

  // A static site has no server for icons: prerendering uses the bundled sets, the browser gets the site's own icons
  // in its bundle (scanned from the pages and content) and any others from the Iconify API.
  icon: {
    provider: { server: 'server', client: 'iconify' },
    clientBundle: {
      scan: {
        globInclude: ['app/**/*.{vue,ts}', 'content/**/*.{md,yml}']
      }
    }
  },

  llms: {
    domain: process.env.NUXT_PUBLIC_SITE_URL || 'https://treygrr.github.io/nuxt-better-auth-ui/',
    title: 'Nuxt Better Auth UI',
    description: 'Sign-in, account and admin pages for Better Auth in Nuxt, built with Nuxt UI.',
    full: {
      title: 'Nuxt Better Auth UI - Full Documentation',
      description: 'The full documentation for the Nuxt Better Auth UI module.'
    },
    sections: [
      {
        title: 'Getting Started',
        contentCollection: 'docs',
        contentFilters: [
          { field: 'path', operator: 'LIKE', value: '/getting-started%' }
        ]
      }
    ]
  },

  ogImage: {
    zeroRuntime: true
  },

  prerender: {
    routes: [
      '/'
    ],
    crawlLinks: true
  }
})
