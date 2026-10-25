<script setup lang="ts">
/** An account card's title, with its icon in front in a soft tinted square, like the overview's tiles. */
defineProps<{ icon: string; title: string; color?: 'primary' | 'error' }>();
</script>

<template>
    <span class="flex items-center gap-2.5">
        <span
            class="grid size-7 shrink-0 place-items-center rounded-md"
            :class="color === 'error' ? 'bg-error/10 text-error' : 'bg-primary/10 text-primary'"
        >
            <UIcon :name="icon" class="size-4" />
        </span>
        {{ title }}
        <!-- Anything after the title, eg a badge. -->
        <slot />
    </span>
</template>
