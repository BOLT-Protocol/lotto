<template>
  <div class="wallet-receipt">

    親愛的客戶您好：<br>
    <br>
    感謝您使用 XGuess 易投注卡，您的易投注卡錢包位址如下，請掃碼使用。<br>
    <br>
    易投注錢包：{{ this.config.address }}

    <Row style="position: relative;">
      <Col span="6" offset="6">
        <span style="color: #8FAFE7; position: absolute; bottom: 15px;">掃描二維碼使用</span>
      </Col>
      <Col span="6">
        <div @click="ticketLink">
          <VueQrcode :value='`${this.config.ip}/#/ticket/`+ this.$route.params.userID' :options="{ width: 200 }"></VueQrcode>
        </div>
      </Col>
    </Row>

    發售面額：{{ this.config.amount }}<br>
    
  </div>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode';
import { Col, Row } from 'vant';

export default {
  data() {
    return {
      show: false,
    };
  },
  components: {
    VueQrcode,
    Col, 
    Row
  },
  methods: {
    ticketLink() {
      window.open(`${this.config.ip}/#/ticket/${this.$route.params.userID}`)
    }
  }
};
</script>

<style>
.wallet-receipt {
  margin: 50px 50px 0px 50px;
  font-size: 23px;
}
</style>

