<template>
  <div class="lotto">
    <h1 :style="{ fontSize: '400%' }">請選擇 1~16 號</h1>
    <Row gutter="20" v-for="(item1, index1) in lottos">
      <div style="margin-top: 10px;"></div>
        <Col span="24" v-for="(item2, index2) in item1">
          <h1 :style="{ fontSize: '300%' }">number {{ index2 + 1 }}</h1>
          <Row gutter="20" >
            <RadioGroup v-model="item2.value">
              <Col span="3" v-for="n in 16">
                <Radio class="lotto-numbers" :style="{ position: 'relative', width: '100px' }" :class="{ 'tens-digit' : n > 9, 'red-lotto-number' : index2 == 4 }" :name="n" icon-size="100px">{{ n }}</Radio>
              </Col>
            </RadioGroup>
            <Col span="24" :style="{ marginTop: '10px' }" >
              <Divider v-show="index2 != 4 || ( index1 != lottos.length - 1)" :class="{ 'number-divider': (index2 == 4) }" :style="{ borderStyle: 'dashed', color: '#FFAC55', borderColor: '#FFAC55', height: '0px', borderWidth: 'thick', marginTop: '20px' }" />
            </Col>              
          </Row>
        </Col>

      <!--</Col>-->
      <div style="margin-bottom: 10px;"></div>
    </Row>
    <Divider :style="{ color: '#6E0D3A', borderColor: '#6E0D3A', padding: '0 100px', height: '0px', borderWidth: 'thick', marginTop: '20px' }" />
    <div style="margin-top: 20px;"></div>
    
    <Button type="primary"  :style="{ fontSize: '50px', height: '100px' }" @click="addLotto">+ 新增一組</Button>

    <div style="margin-top: 20px;"></div>
    <Row>
    <Col span="3">
      <h1 :style="{ fontSize: '300%' }">使用幣種</h1>
    </Col>
    <Col span="4">
    <div style="margin-top: 40px;"></div>
      <RadioGroup v-model="currency">
        <Radio name="hkx" class="radio">hkx</Radio>
        <Radio name="usx" class="radio">usx</Radio>
      </RadioGroup>
    </Col>
    <Col span="15">
      <h2 :style="{ fontSize: '300%' }">總額： {{ cost }} {{ currency }}</h2>
    </Col>
    </Row>

    <div style="margin: 16px;">
      <Button round block type="info" native-type="submit" :style="{ fontSize: '300%', height: '100px' }" @click="onSubmit(lottos)">
        提交
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
import { Button, Col, Row, RadioGroup, Radio, Divider, Notify, Loading, Overlay } from 'vant';
export default {
  data() {
    return {
      show: false,
      value: '',
      lottos: [[{value: 1}, {value: 1}, {value: 1}, {value: 1}, {value: 1}]],
      currency: 'hkx',
      currencyAmount: 0,
    };
  },
  methods: {
    onSubmit() {
      let that = this;
      const data = {
        currency: this.currency,
        numbers: this.lottos.map((item, index) => {
            return item.map((item, index) => {
                return item.value
            })
        })
      }
      this.show = true;
      this.$axios.post(`${this.config.ip}/lotto/${this.$route.params.userID}`, data)
        .then(function(res){
          if(res.data.code === "00000") {
            that.$router.push({ path: `/ticket/${this.$route.params.userID}` })
          } else {
            let message = ''
            let duration = 1000
            that.show = false;
            switch (res.data.code) {
              case '10000':
                message = '總額不對 每注金額為 1/10HKX or 1/1USX'
                break;
              case '10002':
                message = '號碼有誤，請輸入 1~16 間的數字'
                break;
              case '10001':
                message = '選擇幣種不支援'
                break;
              case '10006':
                message = '餘額不足'
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
    validateNumber(index1, index2, value) {
      if (Number(value) < 1 || Number(value) > 16) {
        Notify({
          message: '請輸入 1~16 間的數字',
          duration: 500
        });
      }
      this.lottos[index1][index2].value = Number(value)
    },
    addLotto() {
      this.lottos.push([{value: 1}, {value: 1}, {value: 1}, {value: 1}, {value: 1}]);
    }
  },
  components: {
    Button,
    Col, 
    Row,
    RadioGroup, 
    Radio,
    Divider,
    Notify,
    Loading,
    Overlay,
  },
  computed: {
    cost: function() {
      const rate = this.currency === 'hkx' ? 10 : 1;
      const amount = this.lottos.length
      this.currencyAmount = rate * amount
      return this.currencyAmount
    },
  }
};
</script>

<style>
.lotto {
  margin-right: 50px;
  margin-left: 50px;
}
.van-cell {
  border-style: solid;
  border-width: 2px;
}
.radio > span {
  font-size: 300%;
  line-height: 60px;
}
.radio > div
{
  font-size: 30px;
}
.numberInput > div > div > div > input {
  font-size: 30px;
}
.van-popup {
  font-size: 50px;
  height: 100px;
  padding-top: 37px;
}
.blue-border {
  border-color: #1da4f7;
  border-width: thick;
}
.red-border {
  border-color: red;
  border-width: thick;
}
.lotto-numbers > div > .van-icon-success:before {
  content: ""
}
.lotto-numbers > span {
  font-size: 50px;
  position: absolute;
  color: #000000;
  left: 28px;
}
.lotto-numbers[aria-checked="true"] > span {
  font-size: 50px;
  position: absolute;
  color: #FFFFFF;
  left: 28px;
}
.tens-digit > span {
  left: 18px !important;
}
.red-lotto-number > .van-radio__icon--checked > i {
  background-color: red;
  border-color: red;
}
.loading-block {
  padding: 50px;
  background-color: #fff;
}
.number-divider {
  border-style: solid !important;
}
.van-popup {
  line-height: 60px;
  height: 180px;
}
</style>

