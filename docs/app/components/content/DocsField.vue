<script setup lang="ts">
// Nuxt UI's prose field (`::field`), with the option's default too: `::field{name="enabled" type="boolean" default="false"}`.
// `::field` maps to it in nuxt.config (mdc.components.map); same classes as Nuxt UI's theme (prose.field).
const props = defineProps<{
  name?: string
  type?: string
  default?: string
  required?: boolean
  description?: string
}>()
</script>

<template>
  <div class="my-5">
    <div class="flex flex-wrap items-center gap-x-3 gap-y-1.5 font-mono text-sm">
      <span
        v-if="props.name"
        class="min-w-0 [overflow-wrap:anywhere] font-semibold text-primary"
      >{{ props.name }}</span>

      <div
        v-if="props.type || props.required || props.default"
        class="min-w-0 flex flex-wrap items-center gap-1.5 text-xs"
      >
        <span
          v-if="props.type"
          class="rounded-sm bg-elevated text-toned px-1.5 py-0.5"
        >{{ props.type }}</span>
        <span
          v-if="props.default"
          class="min-w-0 [overflow-wrap:anywhere] rounded-sm border border-default text-muted px-1.5 py-0.5"
        >default: {{ props.default }}</span>
        <span
          v-if="props.required"
          class="rounded-sm bg-error/10 text-error px-1.5 py-0.5"
        >required</span>
      </div>
    </div>

    <div
      v-if="!!$slots.default || props.description"
      class="mt-3 text-muted text-sm [&_code]:text-xs/4"
    >
      <slot mdc-unwrap="p">
        {{ props.description }}
      </slot>
    </div>
  </div>
</template>
