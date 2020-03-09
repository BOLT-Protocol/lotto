import Vue from 'vue';
import VueRouter from 'vue-router';
import Axios from 'axios';
import App from './App.vue';
import 'vant/lib/index.css';

// component
import Lotto from './components/Lotto.vue';
import DrawnDashboard from './components/DrawnDashboard.vue';

Vue.use(VueRouter);
Vue.prototype.$axios = Axios;

const routes = [
  {
    path: '/',
    // 重定向
    component: Lotto,
  },
  {
    path: '/dashboard',
    component: DrawnDashboard,
  },
  // {
  //   path: '/ratings',
  //   component: Ratings
  // },
  // {
  //   path: '/seller',
  //   component: Seller
  // },
];

const router = new VueRouter({
  routes,
  linkActiveClass: 'active',
});

/* eslint-disable no-new */
new Vue({
  el: '#app',
  components: { App },
  template: '<App/>',
  // 4. 建立並掛載實例
  router,
});
