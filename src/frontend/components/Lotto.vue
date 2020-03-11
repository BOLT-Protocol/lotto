<template>
  <div class="lotto">
    <h1 :style="{ fontSize: '400%' }">請選擇 1~16 號</h1>
    <Row gutter="20" v-for="(item1, index1) in lottos">
      <div style="margin-top: 10px;"></div>
      <Col span="24" class="numberInput" :style="{ marginTop: '20px', marginBottom: '20px' }" v-for="(item2, index2) in item1" >
        <Field
          clickable
          v-model="item2.value"
          type="number"
          @input="validateNumber(index1, index2, item2.value)"
          :class="{ 'blueBorder' : index2 < 4, 'redBorder' : index2 === 4}"
        />
      </Col>
      <div style="margin-bottom: 10px;"></div>
      <Divider :style="{ color: '#6E0D3A', borderColor: '#6E0D3A', padding: '0 100px', height: '0px', borderWidth: 'thick', marginTop: '20px' }" />
    </Row>
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
  </div>
</template>

<script>
import { Field, Button, Col, Row, RadioGroup, Radio, Divider, Notify } from 'vant';
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
        currencyAmount: this.currencyAmount,
        numbers: this.lottos.map((item, index) => {
            return item.map((item, index) => {
                return item.value
            })
        })
      }
      this.$axios.post(`${this.config.ip}/lotto`, data)
        .then(function(res){
          if(res.data.code === "00000") {
            that.$router.push({ path: `/receipt/${res.data.data.id}` })
          } else {
            let message = ''
            switch (res.data.code) {
              case '10000':
                message = '總額不對 每注金額為 1/10hkx or 1/1usx'
                break;
              case '10002':
                message = '號碼有誤，請輸入 1~16 間的數字'
                break;
              case '10001':
                message = '選擇幣種不支援'
                break;
              default:
                message = `伺服器錯誤！！(${res.data})`
                break;
            }

            Notify({
              message,
              duration: 500
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
    Field,
    Button,
    Col, 
    Row,
    RadioGroup, 
    Radio,
    Divider,
    Notify,
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
.blueBorder {
  border-color: #1da4f7;
  border-width: thick;
}
.redBorder {
  border-color: red;
  border-width: thick;
}
</style>

