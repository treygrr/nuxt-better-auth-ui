<script setup lang="ts">
// Screenshots with a title and a link to their page, in a grid, for the home page:
// `::screenshot-gallery` with `items: [{ name, title, description, to }]` in its YAML props.
defineProps<{
  items: Array<{ name: string, title: string, description: string, to: string }>
}>()
</script>

<template>
  <div class="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
    <NuxtLink
      v-for="item in items"
      :key="item.name"
      :to="item.to"
      class="group block rounded-lg focus-visible:outline-2 focus-visible:outline-primary"
    >
      <Screenshot
        :name="item.name"
        :alt="item.title"
        class="my-0 transition group-hover:shadow-xl group-hover:-translate-y-0.5"
      />
      <p class="mt-3 font-semibold text-highlighted group-hover:text-primary">
        {{ item.title }}
      </p>
      <p class="mt-1 text-sm text-muted">
        {{ item.description }}
      </p>
    </NuxtLink>
  </div>
</template>
