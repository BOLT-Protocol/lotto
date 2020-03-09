<template>
  <!--<Form @submit="onSubmit" class="wrapper">-->
  <div>
    <Row v-for="item in lottos">
    
      <Col span="4" v-for="(value, index) in item" :key="value.value">
      ${ index }
        <Field
          clickable
          :value="value"
          placeholder="請選擇 1~16 號"
          type="number"
          @input="validateNumber"
        />
      </Col>
      <Col>
        <Button type="danger" @click="deleteLotto(this)">-</Button>
      </Col>
      <br>
    </Row>
    <Button type="primary" @click="addLotto">+</Button>
    <div style="margin: 16px;">
      <Button round block type="info" native-type="submit" @click="onSubmit(lottos)">
        提交
      </Button>
    </div>
  </div>
  <!--</Form>-->
</template>

<script>
import { Form, Field, Button, Col, Row } from 'vant';
import BScroll from 'better-scroll'
export default {
  data() {
    return {
      show: false,
      value: '',
      lottos: [[{value: 0},{value: 0},{value: 0},{value: 0},{value: 0}]]
    };
  },
  methods: {
    onSubmit(value) {
      console.log('value', value)
    },
    validateNumber(value) {

      console.log('=============')
      if (Number(value) < 1 || Number(value) > 16) {
        console.log('validateNumber:', value)
        let valueStr = value.toString()
        value = 0
        console.log('validateNumber:', value)
      }
    },
    deleteLotto() {

    },
    addLotto() {
      this.lottos.push([{value: 0},{value: 0},{value: 0},{value: 0},{value: 0}]);
    }
  },
  components: {
    Form,
    Field,
    Button,
    Col, 
    Row
  },
  mounted: () => {
    // let wrapper = document.querySelector('.van-picker-column')
    // let scroll = new BScroll(wrapper)
  }
};
</script>

<style>
body: {
  background-color: #F7F8FA;
}
</style>

