<template>
  <div class="dashboard">
    <center><h1>stageHeight: {{ this.stageHeight }}</h1></center>
    <Row gutter="50">
      <Col offset="1"></Col>
      <Col span="4" v-for="item in numbers">
        <center class="number blue-number"><h1>{{ item }}</h1></center>
      </Col>

      <Col span="5">
        <center class="number red-number"><h1>{{ superNumber }}</h1></center>
      </Col>
    </Row>
  </div>
</template>

<script>
import { Col, Row } from 'vant';

export default {
  data() {
    return {
      stageHeight: "",
      superNumber: 0,
      numbers: [],
    };
  },
  components: {
    Col, 
    Row
  },
  mounted: function () {
    let that = this;
    that.$axios.get(`${that.config.ip}/lotto`).then(function(res){
      that.stageHeight = res.data.data.stageHeight
      that.superNumber = res.data.data.superNumber
      that.numbers = res.data.data.numbers
    })
    setInterval(function(){ 
      that.$axios.get(`${that.config.ip}/lotto`).then(function(res){
        that.stageHeight = res.data.data.stageHeight
        that.superNumber = res.data.data.superNumber
        that.numbers = res.data.data.numbers
      })
    }, 15000);
  }
};
</script>

<style>
.number {
  color: #ffffff;
  font-size: 300%;
  border-radius: 100%;
  height: 150px;
  width: 150px;
}
.number > h1 {
  padding-top: 5px;
}
.blue-number {
  background-color: #1da4f7;
}
.red-number {
  background-color: red;
}
</style>

