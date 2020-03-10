<template>
  <div class="receipt">
    <center><h3>xGuess</h3></center>
    <Row>
      <Col span="12">
        <h3 :style="{ marginLeft: '20px' }">購買證明</h3>
        <div @click="trustLink">
          <VueQrcode value="https://platform.boltchain.io/" :options="{ width: 200 }"></VueQrcode>
        </div>
      </Col>
      <Col span="12">
        <h2>Amount: {{ currencyAmount }}{{ currency }}</h2>
      </Col>
    </Row>
    <center>
      <Divider :style="{ color: '#6E0D3A', borderColor: '#6E0D3A', padding: '0 100px', height: '0px', borderWidth: 'thick', width: '70%' }" />
    </center>
    <Row>
      <Col span="12">
        <h3 :style="{ marginLeft: '20px' }">兌獎</h3>
        <div @click="drawnLink">
          <VueQrcode v-bind:value="'http://127.0.0.1/lotto/'+id" :options="{ width: 200 }"></VueQrcode>
        </div>
      </Col>
      <Col span="12">
        <h2>No. {{ id }}</h2>
        <Row gutter="80" v-for="item in numbers">
          <Col span="4" v-for="number in item">
            <center>
              <div class="numbers">
                <h1>{{ number }}</h1>
              </div>
            </center>
          </Col>
        </Row>
      </Col>
    </Row>
    <Row>
      <Col span="12">
        <h2></h2>
      </Col>
      <Col span="12">
      </Col>
    </Row>
    <h2>time {{ timeFormat }}</h2>
  
  </div>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode';
import { Col, Row, Divider } from 'vant';
export default {
  data() {
    return {
      id: 0,
      numbers: [],
      stageHeight: 0,
      time: 0,
      currency: '',
      currencyAmount: '',
    };
  },
  components: {
    VueQrcode,
    Col, 
    Row,
    Divider,
  },
  mounted: function () {
    let that = this;
    that.$axios.get(`http://127.0.0.1/lotto/${this.$route.params.id}`).then(function(res){
      that.id = res.data.data._id
      that.numbers = res.data.data.numbers
      that.stageHeight = res.data.data.stageHeight
      that.time = res.data.data.nowTime
      that.currency = res.data.data.currency
      that.currencyAmount = res.data.data.currencyAmount
    })
  },
  methods: {
    drawnLink: function() {
      this.$router.push({ path: `/drawn/${this.id}` })
    },
    trustLink: function() {
      window.open('https://platform.boltchain.io/')
    }
  },
  computed: {
    timeFormat: function() {
      if (!this.time) return '0000-00-00 00:00:00'
      const time = new Date(this.time * 1000).toISOString()
      return `${time.slice(0, 10)} ${time.slice(11, 19)}`
    }
  }
};
</script>

<style>
.receipt {
  margin-right: 50px;
  margin-left: 50px;
}
.numbers {
  color: #ffffff;
  border-radius: 100%;
  background-color: #000000;
  width: 50px;
  height: 50px;
}
</style>

