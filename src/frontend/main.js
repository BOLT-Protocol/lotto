import Vue from 'vue';
import VueRouter from 'vue-router';
import Axios from 'axios';
import App from './App.vue';
import 'vant/lib/index.css';

// component
import Lotto from './components/Lotto.vue';
import DrawnDashboard from './components/DrawnDashboard.vue';
import Drawn from './components/Drawn.vue';
import Receipt from './components/Receipt.vue';

Vue.use(VueRouter);
Vue.prototype.$axios = Axios;
Vue.prototype.config = { ip: 'http://127.0.0.1' };

const routes = [
  {
    path: '/',
    component: Lotto,
  },
  {
    path: '/dashboard',
    component: DrawnDashboard,
  },
  {
    path: '/receipt/:id',
    component: Receipt,
  },
  {
    path: '/drawn/:id',
    component: Drawn,
  },
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
  router,
});
