<script setup>
import HomeView from './views/HomeView.vue'
</script>

<template>
  <header></header>

  <div class="body">
    <HomeView />
  </div>
  
</template>

<style scoped>
  header {
    height: 60px;
    background-color: orange;
    margin-bottom: 24px;
  }

  .body {
    padding: 0 25% 60px 25%;
  }
</style>
