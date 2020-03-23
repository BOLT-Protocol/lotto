<template>
  <div class="drawn">
    <Row>
      <Col span="8">
        <span style="font-size: 300%;font-weight: bold;">XGuess</span><br>
        <span style="font-size: 250%">區塊鏈競猜遊戲</span><br>
      </Col>
      <Col span="8">
        <center><h1 :style="{ fontSize: '300%' }">兌獎頁</h1></center>
      </Col>
    </Row>
    <span style="font-size: 250%">預測期數：No.{{ this.lottoIssue }}</span><br>
    <span style="font-size: 250%">該期獎號：</span>
    <center><h1 :style="{ fontSize: '200%' }"></h1></center>
    <Row gutter="50">
      <Col offset="1"></Col>
      <Col span="4" v-for="item in lottoNumbers">
        <center class="number blue-number"><h1>{{ item }}</h1></center>
      </Col>
      <Col span="5">
        <center class="number red-number"><h1>{{ lottoSuperNumber }}</h1></center>
      </Col>
    </Row>
    <center><h1 :style="{ fontSize: '250%' }">你的票券</h1></center>
    <Row gutter="50" v-for="items in result">
      <Col span="4" v-for="(item, index) in items.numbers">
        <center class="number" :class="{ 'blue-number' : index < 4, 'red-number' : index === 4 }"><h1>{{ item }}</h1></center>
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
      lottoIssue: '',
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
        that.stageHeight = Number(res.data.data.ticketInfo.stageHeight)
        that.lottoNumbers = res.data.data.drawn.numbers
        that.lottoSuperNumber = res.data.data.drawn.superNumber
        that.lottoIssue = res.data.data.drawn._id
        that.id = res.data.data.drawn._id
        that.result = res.data.data.result
      }
    })
  }
};
</script>

<style>
.drawn {
  margin: 50px;
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

