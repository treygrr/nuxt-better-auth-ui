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

  // `::field` with a default, for options (app/components/content/DocsField.vue).
  mdc: {
    components: {
      map: { field: 'DocsField' }
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
    // One per folder in content/.
    sections: [
      ['Getting Started', '/getting-started'],
      ['Sign-in', '/sign-in'],
      ['Organizations', '/organizations'],
      ['Admin dashboard', '/admin'],
      ['Integrations', '/integrations'],
      ['Customization', '/customization'],
      ['Reference', '/reference']
    ].map(([title, path]) => ({
      title: title!,
      contentCollection: 'docs' as const,
      contentFilters: [{ field: 'path', operator: 'LIKE' as const, value: `${path}%` }]
    }))
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
