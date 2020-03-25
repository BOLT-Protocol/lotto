<template>
  <div class="create-wallet">
    <h1 :style="{ fontSize: '350%' }">［ 遊戲卡後台 - 客戶入金介面 ］</h1>

    <Row style="position: relative">
      <Col span="24">
        <Field class="deposit-field" v-model="value" placeholder="請選擇票卡面額" />
      </Col>
      <Col span="2" style="position: absolute; right: 14px;">
        <DropdownMenu class="field-dropdown-menu">
          <DropdownItem class="field-dropdown-item" v-model="value" :options="option" />
        </DropdownMenu>
      </Col>
    </Row>
    <div style="margin-top: 20px;">
      <Button round block type="info" native-type="submit" :style="{ fontSize: '300%', height: '100px' }" @click="onSubmit()">
        確認送出
      </Button>
    </div>
    <Overlay :show="show">
      <div class="wrapper" @click.stop>
        <div class="loading-block">
          <Loading color="#1989fa" size="200" />
        </div>
      </div>
    </Overlay>
  </div>
</template>

<script>
import { Field, Button, Col, Row, Loading, Overlay, DropdownMenu, DropdownItem, Notify } from 'vant';
export default {
  data() {
    return {
      show: false,
      value: '請選擇票卡面額',
      option: [
        { text: '100HKX  (訂價：100HKX$)', value: '100HKX' },
        { text: '500HKX  (訂價：500HKX$)', value: '500HKX' },
        { text: '1000HKX  (訂價：1000HKX$)', value: '1000HKX' },
        { text: '10USX  (訂價：100HKX$)', value: '10USX' },
        { text: '50USX  (訂價：100HKX$)', value: '50USX' },
        { text: '100USX  (訂價：100HKX$)', value: '100USX' },
        { text: '自訂', value: '' },
      ]
    };
  },
  methods: {
    onSubmit() {
      if(this.value.indexOf("HKX") === -1 && this.value.indexOf("USX") === -1) {
        Notify({
          message: '僅支援 HKX / USX',
          duration: 500
        });
        return
      }
      let amount = '';
      let currency = '';
      if(this.value.indexOf("HKX") !== -1) {
        amount = this.value.replace("HKX", "");
        currency = "HKX"
      }
      if(this.value.indexOf("USX") !== -1) {
        amount = this.value.replace("USX", "");
        currency = "USX"
      }
      this.show = true;

      let that = this;
      this.$axios.post(`${this.config.ip}/user/register`, { amount, currency })
        .then(function(res){
          if(res.data.code === "00000") {
            that.config.address = res.data.data.address
            that.config.amount = `${amount}${currency}`
            that.$router.push({ path: `/wallet/${res.data.data.userID}` })
          } else {
            let message = ''
            let duration = 500
            that.show = false;
            switch (res.data.code) {
              case '00013':
                message = '選擇幣種不支援，僅支援 HKX / USX'
                break;
              default:
                message = `伺服器錯誤！！(${JSON.stringify(res.data.message)})`
                duration = 1500
                break;
            }

            Notify({
              message,
              duration
            });
          }
        })
    },
  },
  components: {
    Field,
    Button,
    Col, 
    Row,
    Loading,
    Overlay,
    DropdownMenu, 
    DropdownItem,
    Notify
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
.field-dropdown-menu {
  height: 58px ;
  margin-top: 3px;
}
.field-dropdown-menu > div > span > .van-ellipsis {
  display: none;
}
.field-dropdown-menu > div[role="button"] {
  height: 100px;
}
.van-dropdown-menu__title::after {
  top: -20px;
  right: -15px;
  border: 20px solid;
  border-color: transparent transparent currentColor currentColor;
}
.deposit-field {
  height: 100px;
}
.field-dropdown-menu > div > .van-dropdown-item--down {
  margin: 0px 50px;
}
.field-dropdown-menu > div > div > .van-popup {
  margin-top: 40px;
  padding-top: 0px;
  height: 530px;
}
.field-dropdown-menu > div > div > .van-overlay {
  margin-top: 40px;
}
.deposit-field > div > div > input {
  font-size: 55px;
}
.field-dropdown-item > div > .van-popup > div > .van-cell__title {
  font-size: 45px;
  margin: 15px 0;
}
.van-dropdown-item__option--active .van-dropdown-item__icon {
  color: #1989fa;
  font-size: 500%;
  margin-top: 25px;
}
.field-dropdown-item > div > .van-popup > div > .van-cell__title {
  flex-grow: 6;
}
</style>

