<template>
  <div id="app">

    <!--<Myheader></Myheader>-->
    <keep-alive>
      <router-view></router-view>
    </keep-alive>

  </div>
</template>

<script>
// import Myheader from './components/Header'
// import Mynav from './components/Nav/Nav'
// import { Form, Field, Button, Col, Row } from 'vant';

import { log } from 'util';
export default {
  name: 'App',
  components: {
    // Myheader,
    // Mynav,
  },
  data() {
    return {
      // header 所需要的資料
      poiInfo: {},
      commentNum: 0,
    }
  },
  // created() { // Ajax
  //   let that = this; // 指向 App.vue 的實例
  //   this.$axios.get('/api/goods').then(function(res) {  // 這個 this 指向 Vue 的實例
  //     let dataSource = res.data;
  //     if(dataSource.code == 0) {
  //       that.poiInfo = dataSource.data.poi_info;
  //     }
  //   }).catch(function(err) {
  //     console.log(err);
  //   });
  //   this.$axios.get('/api/ratings').then(function(res) {
  //     let dataSource = res.data;
  //     if(dataSource.code == 0) {
  //       that.commentNum = dataSource.data.comment_num;
  //     }
  //   }).catch(function(err) {
  //     console.log(err);
  //   });
  // }
};
</script>

<style>
</style>