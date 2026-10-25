// Takes the docs' screenshots (docs/public/screenshots/<name>-<light|dark>.webp) from the built playground, with its
// mock users and an example organization. Run from the repository root, after building the module and the playground:
//
//   pnpm build && pnpm dev:build
//   pnpm docs:screenshots
//
// It starts its own server on port 3943 with a fresh database, so it never touches your dev server or its data.
import { spawn } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { chromium } from 'playwright-core'

const root = fileURLToPath(new URL('../..', import.meta.url))
const out = join(root, 'docs/public/screenshots')
const port = 3943
const base = `http://localhost:${port}`
const admin = { email: 'admin@example.com', password: 'password123' }
const executablePath
  = process.env.CHROMIUM_PATH ?? ['/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome'][0]

// The playground's server, with a throwaway database seeded with an admin and mock users.
const dataDir = mkdtempSync(join(tmpdir(), 'better-auth-ui-screenshots-'))
const server = spawn(process.execPath, ['playground/.output/server/index.mjs'], {
  cwd: root,
  env: {
    ...process.env,
    PORT: String(port),
    AUTH_DATABASE_PATH: join(dataDir, 'auth.sqlite'),
    NUXT_APP_SECRET: 'screenshots-secret-at-least-32-characters-long',
    NUXT_PUBLIC_SITE_URL: base,
    // Real-looking providers and an app name, instead of the tests' mocks.
    PLAYGROUND_DEMO: '1',
    PLAYGROUND_MOCK_OAUTH: '',
    GITHUB_CLIENT_ID: '',
    PLAYGROUND_ADMIN_EMAIL: admin.email,
    PLAYGROUND_ADMIN_PASSWORD: admin.password,
    PLAYGROUND_MOCK_USERS: '40',
    PLAYGROUND_CAPTCHA_SITE_KEY: '',
    PLAYGROUND_HIBP: '',
    PLAYGROUND_LOCALE: ''
  },
  stdio: ['ignore', 'pipe', 'inherit']
})
const stop = () => {
  server.kill()
  rmSync(dataDir, { recursive: true, force: true })
}
process.on('exit', stop)

// Ready once it has seeded (the log line names the admin).
await new Promise((resolve, reject) => {
  server.stdout.on('data', data => String(data).includes('Sign in as') && resolve())
  server.on('exit', code => reject(new Error(`The playground exited (${code}). Run pnpm build && pnpm dev:build.`)))
})

// Better Auth's API, as the admin.
const cookiesOf = response =>
  response.headers
    .getSetCookie()
    .map(cookie => cookie.split(';')[0])
    .join('; ')
const signedIn = await fetch(`${base}/api/auth/sign-in/email`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'origin': base },
  body: JSON.stringify(admin)
})
const cookie = cookiesOf(signedIn)
const api = async (path, body) => {
  const response = await fetch(`${base}${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'content-type': 'application/json', 'origin': base, cookie },
    body: body && JSON.stringify(body)
  })
  if (!response.ok) throw new Error(`${path}: ${response.status} ${await response.text()}`)
  return response.json()
}

// An example organization: members with roles, teams, an invitation, a role of its own, and an identity provider.
const { users } = await api('/api/auth/admin/list-users?limit=12&sortBy=createdAt&sortDirection=asc')
const people = users.filter(user => user.email !== admin.email && user.role !== 'admin' && !user.banned)
const organization = await api('/api/auth/organization/create', {
  name: 'Acme Inc',
  slug: 'acme',
  logo: 'https://api.dicebear.com/9.x/shapes/svg?seed=acme',
  website: 'https://acme.example'
})
const roles = ['admin', 'editor', 'member', 'member', 'editor']
for (const [index, person] of people.slice(0, roles.length).entries()) {
  await api(`/api/_better-auth-ui/organizations/${organization.id}/members`, {
    email: person.email,
    roles: [roles[index]]
  })
}
for (const name of ['Design', 'Platform']) {
  const team = await api('/api/auth/organization/create-team', { name, organizationId: organization.id })
  for (const person of name === 'Design' ? people.slice(0, 2) : people.slice(2, 5)) {
    await api('/api/auth/organization/add-team-member', { teamId: team.id, userId: person.id })
  }
}
await api('/api/auth/organization/invite-member', {
  email: 'new.hire@acme.example',
  role: 'member',
  organizationId: organization.id
})
await api('/api/auth/organization/create-role', {
  role: 'reviewer',
  permission: { project: ['update'] },
  organizationId: organization.id
})
// An Okta-like provider, registered without discovery (nothing answers at acme.okta.com).
const okta = 'https://acme.okta.com'
await api('/api/auth/sso/register', {
  providerId: 'acme-okta',
  issuer: okta,
  domain: 'acme.example',
  organizationId: organization.id,
  oidcConfig: {
    clientId: '0oa8acmeclient4x7',
    clientSecret: 'acme-secret',
    skipDiscovery: true,
    authorizationEndpoint: `${okta}/oauth2/v1/authorize`,
    tokenEndpoint: `${okta}/oauth2/v1/token`,
    jwksEndpoint: `${okta}/oauth2/v1/keys`
  }
})

// The admin's own account: API keys.
await api('/api/_better-auth-ui/api-keys', {
  name: 'Deploy script',
  expiresInDays: 90,
  scopes: ['projects:read', 'projects:write']
})
await api('/api/_better-auth-ui/api-keys', { name: 'Analytics export', expiresInDays: null, scopes: ['projects:read'] })

// Some admin activity for the audit log: a ban and a role change.
await api('/api/auth/admin/ban-user', { userId: people[6].id, banReason: 'Spam in chat', banExpiresIn: 60 * 60 * 24 * 7 })
await api('/api/auth/admin/set-role', { userId: people[7].id, role: 'moderator' })

// A TV asking to sign in, for the device page.
const device = await fetch(`${base}/api/auth/device/code`, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'origin': base },
  body: JSON.stringify({ client_id: 'playground-tv' })
}).then(response => response.json())

// Each page, signed in as the admin unless it says otherwise.
const shots = [
  { name: 'sign-in', path: '/login', signedOut: true },
  { name: 'account', path: '/account' },
  // Scrolled to the feature's card (`scrollTo`: its title), past the account's overview.
  // Passkeys, two-factor and sign-in methods.
  { name: 'account-security', path: '/account?tab=security', scrollTo: 'Passkeys' },
  { name: 'account-api-keys', path: '/account?tab=api-keys', scrollTo: 'API keys' },
  { name: 'account-billing', path: '/account?tab=billing', scrollTo: 'Your plan' },
  { name: 'organization', path: `/organization/${organization.id}?tab=members` },
  { name: 'organization-roles', path: `/organization/${organization.id}?tab=roles` },
  { name: 'organization-sso', path: `/organization/${organization.id}?tab=sso` },
  { name: 'device', path: `/device?user_code=${device.user_code}` },
  { name: 'admin-home', path: '/admin', wait: 2000 },
  { name: 'admin-users', path: '/admin/users' },
  { name: 'admin-user', path: `/admin/users/${people[0].id}` },
  { name: 'admin-audit', path: '/admin/audit' },
  { name: 'admin-configuration', path: '/admin/configuration' }
]

mkdirSync(out, { recursive: true })
const browser = await chromium.launch({ executablePath })
for (const colorScheme of ['light', 'dark']) {
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 2, colorScheme })
  const [name, value] = cookie.split('; ').map(pair => pair.split('=')).find(([key]) => key.includes('session_token'))
  const signedInCookies = [{ name, value: decodeURIComponent(value), url: base }]
  for (const shot of shots) {
    await context.clearCookies()
    if (!shot.signedOut) await context.addCookies(signedInCookies)
    const page = await context.newPage()
    // Passkey autofill would prompt on the sign-in page.
    await page.addInitScript(() => {
      if (window.PublicKeyCredential) PublicKeyCredential.isConditionalMediationAvailable = async () => false
    })
    await page.goto(`${base}${shot.path}`, { waitUntil: 'networkidle' })
    if (shot.scrollTo) {
      await page.getByText(shot.scrollTo, { exact: true }).last().evaluate((element) => {
        window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 140)
      })
    }
    await page.waitForTimeout(shot.wait ?? 800)
    const png = await page.screenshot()
    // WebP, encoded by Chromium itself: a fraction of the PNG's size.
    const webp = await page.evaluate(async (dataUrl) => {
      const image = new Image()
      image.src = dataUrl
      await image.decode()
      const canvas = Object.assign(document.createElement('canvas'), {
        width: image.width,
        height: image.height
      })
      canvas.getContext('2d').drawImage(image, 0, 0)
      return canvas.toDataURL('image/webp', 0.82).split(',')[1]
    }, `data:image/png;base64,${png.toString('base64')}`)
    writeFileSync(join(out, `${shot.name}-${colorScheme}.webp`), Buffer.from(webp, 'base64'))
    console.log(`${shot.name}-${colorScheme}.webp`)
    await page.close()
  }
  await context.close()
}
await browser.close()
stop()
process.exit(0)
