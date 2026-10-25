const repository = 'https://github.com/treygrr/nuxt-better-auth-ui'

export default defineAppConfig({
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },
    footer: {
      slots: {
        root: 'border-t border-default',
        left: 'text-sm text-muted'
      }
    }
  },
  seo: {
    siteName: 'Nuxt Better Auth UI'
  },
  header: {
    title: 'Nuxt Better Auth UI',
    to: '/',
    logo: {
      alt: '',
      light: '',
      dark: ''
    },
    search: true,
    colorMode: true,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': repository,
      'target': '_blank',
      'aria-label': 'GitHub'
    }]
  },
  footer: {
    credits: `MIT licensed • Built with Nuxt UI • © ${new Date().getFullYear()}`,
    colorMode: false,
    links: [{
      'icon': 'i-simple-icons-github',
      'to': repository,
      'target': '_blank',
      'aria-label': 'Nuxt Better Auth UI on GitHub'
    }]
  },
  toc: {
    title: 'Table of Contents',
    bottom: {
      title: 'Links',
      edit: `${repository}/edit/main/docs/content`,
      links: [{
        icon: 'i-lucide-star',
        label: 'Star on GitHub',
        to: repository,
        target: '_blank'
      }, {
        icon: 'i-lucide-book-open',
        label: 'Better Auth docs',
        to: 'https://better-auth.com/docs',
        target: '_blank'
      }]
    }
  }
})
