<template>
  <div class="header">
    <Tabs v-model="active">
      <Tab title="标签 1" name="1">内容 1</Tab>
      <Tab title="标签 2" name="2">内容 2</Tab>
    </Tabs>

  </div>
</template>

<script>

import { Tab, Tabs } from 'vant';
export default {
  data() {
    return {
      active: 2,
      name
    };
  },
  components: {
    Tab, 
    Tabs
  },
};
</script>

<style>
</style>

