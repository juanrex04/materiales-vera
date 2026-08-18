<template>
  <div v-if="modelValue" class="modal-overlay" @click.self="closeOnOverlay ? close() : null">
    <div :class="['modal-content', size === 'large' ? 'modal-largo' : '']">
      <div class="modal-header">
        <h3>{{ title }}</h3>
        <button class="btn-close" @click="close">✖</button>
      </div>
      <slot />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: Boolean, required: true },
  title: { type: String, required: true },
  size: { type: String, default: 'default' },
  closeOnOverlay: { type: Boolean, default: false }
});

const emit = defineEmits(['update:modelValue']);

const close = () => emit('update:modelValue', false);
</script>
