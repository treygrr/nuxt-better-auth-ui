<script setup lang="ts">
// A screenshot of the playground (docs/public/screenshots/<name>-<light|dark>.webp, from `pnpm docs:screenshots`), in a
// frame, matching the site's color mode: `:screenshot{name="admin-home" alt="The admin dashboard's home page"}`.
const props = withDefaults(defineProps<{ name: string, alt: string, eager?: boolean }>(), { eager: false })

// Under the base URL: on GitHub Pages the site lives at /<repository>/.
const { baseURL } = useRuntimeConfig().app
const src = (mode: 'light' | 'dark') => `${baseURL}screenshots/${props.name}-${mode}.webp`
</script>

<template>
  <figure class="my-6 overflow-hidden rounded-lg border border-default bg-default shadow-lg shadow-neutral-950/5">
    <img
      :src="src('light')"
      :alt="alt"
      width="1280"
      height="800"
      :loading="eager ? 'eager' : 'lazy'"
      class="block w-full h-auto dark:hidden"
    >
    <img
      :src="src('dark')"
      :alt="alt"
      width="1280"
      height="800"
      :loading="eager ? 'eager' : 'lazy'"
      class="hidden w-full h-auto dark:block"
    >
  </figure>
</template>
