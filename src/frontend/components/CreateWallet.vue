<template>
  <div class="create-wallet">
    <h1 :style="{ fontSize: '350%' }">［ 遊戲卡後台 - 客戶入金介面 ］</h1>

    <h1 style="font-size: 300%; display: none;" v-show="!pageShow">匯款到指定錢包地址</h1>
    <center v-show="show">
      <VueQrcode value="ethereum:0xacE258f5F6AB1fa6f5730Df066f8514976081850" class="deposit-qr-code"></VueQrcode>
    </center>
    
    <div style="margin-top: 20px" v-if="!show && !pageShow">
      <Button round block type="info" native-type="submit" :style="{ fontSize: '300%', height: '100px' }" @click="onSubmit()">
        顯示匯款錢包地址
      </Button>
    </div>

    <Overlay :show="pageShow">
      <div class="info-wrapper">
        <div class="info-block">
          <h1 :style="{ fontSize: '200%' }">在線人數過多，請稍後再試</h1>
        </div>
      </div>
    </Overlay>

    <Overlay :show="depositShow">
      <div class="info-wrapper">
        <div class="info-block">
          <h1>入金中請勿從整畫面</h1>
          <Loading color="#1989fa" size="200" />
        </div>
      </div>
    </Overlay>
  </div>
</template>

<script>
import { Button, Overlay, Loading } from 'vant';
import VueQrcode from '@chenfengyuan/vue-qrcode';
export default {
  data() {
    return {
      show: false,
      pageShow: false,
      depositShow: false,
      userID: '',
    };
  },
  mounted: function () {
    let that = this;
    this.$axios.get(`${this.config.ip}/check`, { withCredentials : true }).then(function(res){
      if(!res.data.success) {
        that.pageShow = true
      }
    })
  },
  sockets: {
      checkDeposit: function (data) {
        this.config.address = data.address
        this.config.amount = data.amount
        this.$router.push({ path: `/wallet/${this.userID}` })
      },
      depositing: function (data) {
        this.depositShow = true
      }
    },
  methods: {
    onSubmit() {
      this.show = !this.show
      let that = this;
      that.$axios.post(`${this.config.ip}/user/register`).then(function(res){
        that.userID = res.data.data.userID
      })
    },
  },
  components: {
    Button,
    Overlay,
    Loading,
    VueQrcode
  },
};
</script>

<style>
.create-wallet {
  margin-right: 50px;
  margin-left: 50px;
}
.van-cell {
  border-style: solid;
  border-width: 1px;
}
.deposit-field {
  height: 100px;
}
.deposit-field > div > div > input {
  font-size: 55px;
}
.deposit-qr-code {
  width: 80% !important;
  height: 80% !important;
}
.info-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.info-block {
  font-size: 150%;
  width: 600px;
  padding: 20px;
  background-color: #fff;
  text-align: center;
}
</style>

