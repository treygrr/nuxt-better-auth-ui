# Nuxt Better Auth UI docs

The module's documentation site, made from the [Nuxt UI docs template](https://github.com/nuxt-ui-templates/docs) with
[Nuxt Content](https://content.nuxt.com). Pages are Markdown in `content/`.

From the repository root:

```bash
pnpm install
pnpm docs:dev       # http://localhost:3002
pnpm docs:generate  # static site in docs/.output/public
```

It's published to GitHub Pages by `.github/workflows/docs.yml` on pushes to `main` that change `docs/`. The build is
static (every page prerendered), served from `/<repository>/` through `NUXT_APP_BASE_URL`.
