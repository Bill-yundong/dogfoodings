<template>
  <div id="app">
    <SemanticMapping />
  </div>
</template>

<script setup lang="ts">
import SemanticMapping from './views/SemanticMapping.vue';
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: Arial, sans-serif;
  background-color: #f5f5f5;
  color: #333;
}

#app {
  min-height: 100vh;
  padding: 20px;
}
</style>
