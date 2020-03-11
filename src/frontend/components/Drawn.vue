<template>
  <div class="drawn">
    <center><h1 :style="{ fontSize: '300%' }">開獎</h1></center>
    <center><h1 :style="{ fontSize: '200%' }">stageHeight: {{ stageHeight }}</h1></center>
    <Row gutter="50">
      <Col offset="1"></Col>
      <Col span="4" v-for="item in lottoNumbers">
        <center class="number blueNumber"><h1>{{ item }}</h1></center>
      </Col>
      <Col span="5">
        <center class="number redNumber"><h1>{{ lottoSuperNumber }}</h1></center>
      </Col>
    </Row>
    <center><h1 :style="{ fontSize: '250%' }">你的票券</h1></center>
    <Row gutter="50" v-for="items in result">
      <Col span="4" v-for="(item, index) in items.numbers">
        <center class="number" :class="{ 'blueNumber' : index < 4, 'redNumber' : index === 4}"><h1>{{ item }}</h1></center>
      </Col>
      <Col span="4">
        <center><h1 :style="{ marginTop: '110px' }">{{ items.payoffType }}</h1></center>
      </Col>
    </Row>
    <Overlay :show="show">
      <div class="wrapper" @click.stop @click="show = false">
        <div class="block">
          <center>
            <h1 :style="{ fontSize: '300%' }">尚未開獎</h1>
          </center>
        </div>
      </div>
    </Overlay>
  </div>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode';
import { Col, Row, Divider, Overlay } from 'vant';
export default {
  data() {
    return {
      show: false,
      id: 0,
      lottoNumbers: [],
      lottoSuperNumber: '',
      result: [],
      stageHeight: '',
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
    Overlay,
  },
  mounted: function () {
    let that = this;
    this.$axios.get(`${this.config.ip}/drawn/${this.$route.params.id}`).then(function(res){
      if (res.data.code === '10004') {
        that.show = true
      } else {
        that.stageHeight = `0x${res.data.data.drawn.stageHeight}`
        that.lottoNumbers = res.data.data.drawn.numbers
        that.lottoSuperNumber = res.data.data.drawn.superNumber
        that.id = res.data.data.drawn._id
        that.result = res.data.data.result
      }
    })
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
.drawn {
  margin-right: 50px;
  margin-left: 50px;
}
.numbers {
  color: #ffffff;
  border-radius: 100%;
  width: 50px;
  height: 50px;
}
.wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.block {
  padding: 10px 80px;
  background-color: #fff;
}

</style>

