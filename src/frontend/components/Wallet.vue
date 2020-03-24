<template>
  <div class="wallet">

    <Row style="height: 470px">
      <Col span="7">
        <span :style="{ fontSize: '300%' }">XGuess</span><br>
        <span :style="{ fontSize: '130%' }">區塊鏈競猜遊戲卡</span>

        <div class="guess-rule">
        [遊戲規則]<br>
        每期依序產生 5 個獎號，由數字 1~16 選擇獎號，按順序選擇 5 次。<br>
        4+1 碼：5000000 HKX<br>
        4+0 碼：777777 HKX<br>
        3+1 碼：12345 HKX<br>
        2+1 碼：321 HKX<br>
        1+1 碼：12 HKX
        </div>
      </Col>
      <Col span="1">
        <div style="
            background: black;
            width: 2px;
            height: 480px;
            margin: 0 21px;
        "></div>
      </Col>
      <Col span="16">
        <Row>
          <Col span="6">
            <div @click="guessLink">
              <VueQrcode :value="`${this.config.ip}/#/guess/`+this.$route.params.userID" :options="{ width: 150 }" style="margin-left: -5px;"></VueQrcode>
            </div>
          </Col>
          <Col span="18">
            <Row style="margin-top: 10px">
              <Col span="14" style="margin-top: 20px;">
                <span>你的錢包地址：</span>
              </Col>
              <Col span="10">
                <Button round block type="info" native-type="submit" :style="{ fontSize: '90%', height: '50px' }" @click="emailShow = true">
                  轉寄到郵箱
                </Button>
              </Col>
            </Row>
            <div class="ellipsis-field">
              <span>{{ this.address }}</span>
            </div>
            <Row style="margin-top: 10px">
              <Col span="14" style="margin-top: 20px;">
                <span>你的私鑰：</span>
              </Col>
              <Col span="10">
                <Button round block class="copy" type="info" native-type="submit" :style="{ fontSize: '90%', height: '50px' }" @click="copy()">
                  複製
                </Button>
              </Col>
            </Row>
            <div class="ellipsis-field">
              <span>{{ this.apiSecret }}</span>
            </div>
          </Col>
        </Row>

        <div style="
            background: black;
            width: 100%;
            height: 2px;
            margin: 10px 0px;
        "></div>

        <Row style="margin-top: 30px; line-height: 50px;">
          <Col span="11">
            <Row>
              <Col span="12">
                <div style="text-align: center">
                  <span style="font-size: 30px;">票卡餘額</span><br>
                  <span style="font-size: 30px;font-weight: bold;">{{ this.balance }} {{ this.currency }}</span>
                </div>
              </Col>
              <Col span="12">
                <div style="text-align: center">
                  <span style="font-size: 30px;">還可投注</span><br>
                  <span style="font-size: 30px;font-weight: bold;">{{ unit }} 單位</span>
                </div>
              </Col>
            </Row>
            <Button block type="info" native-type="submit" :style="{ fontSize: '120%', height: '50px' }" @click="guessLink()">
              前往 XGuess 競猜
            </Button>
          </Col>
          <Col span="1">
          </Col>
          <Col span="12">
            <span>下期開獎區塊：</span><br>
            <span style="font-size: 20px; font-weight: bold;">期數 No.{{ this.nextLottoIssue }} <br>( 塊高 {{ this.drawnStageHeight }} )</span><br>
            <span>開獎倒數計時：</span><br>
            <span style="font-size: 24px; font-weight: bold;">
              <CountDown :time="time" format="還有 mm 分 ss 秒 開出獎號" style="font-size: 24px"></CountDown>
            </span>
          </Col>
        </Row>
      </Col>
    </Row>

    <div style="
        background: black;
        width: 100%;
        height: 2px;
        margin: 10px 0px;
    "></div>

    <Row>
      <Col span="24" style="font-size: 300%; font-weight: bold; text-align: center">
        <span>My Guesses</span>
      </Col>
      <Col span="24" class="guess-item" v-for="(item, index) in LottoTickets">
        <Row>
          <Col span="8">
            <span style="font-weight: bold;">遊戲期數：{{ item.lottoIssue }}</span><br>
            <span>預測單號： </span><br>
            <span style="font-weight: bold; font-size: 20px;">{{ item._id }}</span><br>
            <span>購買時間： </span><br>
            <span style="font-weight: bold;">{{ timeFormat(item.nowTime) }}</span><br>
          </Col>
          <Col span="5">
            <span>預測獎號</span><br>
            <span v-for="(numbers, index) in item.numbers" style="font-size: 120%; font-weight: bold;">
              <span v-for="(number, index) in numbers">{{ number }} </span><br>
            </span>
          </Col>
          <Col span="2" style="text-align: center">
            <span>倍率</span><br>
            <span style="font-size: 120%; font-weight: bold;">{{ item.multipliers }}</span>
          </Col>
          <Col span="9" style="padding-left: 30px;">
            <span>開獎倒數計時：</span><br>
            <span>
              <CountDown :time="item.time" format="還有 mm 分 ss 秒 開出獎號" style="font-size: 24px"></CountDown>
            </span><br>
            <Row>
              <Col span="12">
                <span>兌獎二維碼</span><br>
                <div class="drawn-link">
                  <span @click="drawnLink(item._id)">前往兌獎頁</span>
                </div>
              </Col>
              <Col span="12">
                <VueQrcode :value="`${ip}/#/drawn/${item._id}`" :options="{ width: 150 }" style="margin-left: -5px;"></VueQrcode>
              </Col>
            </Row>
          </Col>
        </Row>
      </Col>
    </Row>

    <Overlay :show="emailShow">
      <div class="mail-wrapper">
        <div class="mail-block">
        <Row>
          <Col span="24">
            <span>請輸入 Email：</span>
            <div style="margin: 15px 0px;">
              <Field v-model="email" style="font-size: 120%;"></Field>
            </div>
          </Col>
          <Col span="12">
            <Button block type="danger" native-type="submit" :style="{ fontSize: '130%', height: '60px' }" @click="emailShow = false">
              取消
            </Button>
          </Col>
          <Col span="12">
            <Button block type="info" native-type="submit" :style="{ fontSize: '130%', height: '60px' }" @click="mail()">
              送出
            </Button>
          </Col>
        </Row>
        </div>
      </div>
    </Overlay>

    <Overlay :show="show">
      <div class="wrapper">
        <div class="block">
          <center>
            <h1 :style="{ fontSize: '250%' }">{{ errorMsg }}</h1>
          </center>
        </div>
      </div>
    </Overlay>
  </div>
</template>

<script>
import VueQrcode from '@chenfengyuan/vue-qrcode';
import { Col, Row, Overlay, Button, CountDown, Field, Notify } from 'vant';

export default {
  data() {
    return {
      email: '',
      ip: '',
      balance: '',
      nowStageHeight: '',
      drawnStageHeight: '',
      currency: '',
      address: '',
      apiSecret: '',
      nextLottoIssue: '',
      LottoTickets: '',
      errorMsg: '找不到用戶',
      show: false,
      time: 10 * 15 * 1000,
      emailShow: false,
    };
  },
  components: {
    VueQrcode,
    Col, 
    Row,
    Overlay,
    Button,
    CountDown,
    Field,
    Notify
  },
  computed: {
    unit: function() {
      if (this.currency === 'HKX') return Number(this.balance) / 10
      return this.balance
    }
  },
  mounted: function () {
    this.ip = this.config.ip
    let that = this;
    that.$axios.get(`${this.config.ip}/user/${this.$route.params.userID}/info`).then(function(res){
      if(res.data.code !== '00000') {
        that.show = true
        return
      }
      that.balance = res.data.data.balance
      that.multipliers = res.data.data.multipliers
      that.currency = res.data.data.currency
      that.address = res.data.data.address
      that.nextLottoIssue = res.data.data.nextLottoIssue
      that.LottoTickets = res.data.data.LottoTickets
      that.apiSecret = res.data.data.apiSecret
      that.apiSecretRaw = res.data.data.apiSecret
      that.nowStageHeight = Number(res.data.data.nowStageHeight)
      that.drawnStageHeight = that.nowStageHeight - (that.nowStageHeight % 100) + 200
      that.time = (that.drawnStageHeight - that.nowStageHeight) * 15 * 1000

      for (let i = that.apiSecret.length - 1; i > 17; i--) {
        that.apiSecret = that.apiSecret.substr(0,i) + '*' + that.apiSecret.substr(i+1);
      }

      // calculator every LottoTickets time
      for (let i = 0; i < that.LottoTickets.length; i++) {
        const ticketDrawnStageHeight = Number(that.LottoTickets[i].drawnStageHeight)
        if (ticketDrawnStageHeight - that.nowStageHeight <= 200) {
          that.LottoTickets[i].time = (ticketDrawnStageHeight - that.nowStageHeight) * 15 * 1000
        } else {
          that.LottoTickets[i].time = 0
        }
      }
    })
    .catch((e) => {
      that.show = true
      that.errorMsg = 'server error' + e.message
    })
  },
  methods: {
    guessLink() {
      this.$router.push({ path: `/guess/${this.$route.params.userID}` })
    },
    drawnLink(id) {
      this.$router.push({ path: `/drawn/${id}` })
    },
    mail() {
      this.emailShow = false;
      let that = this;
      that.$axios.get(`${this.config.ip}/user/${this.$route.params.userID}/email?to=${this.email}`).then(function(res){
        if(res.data.code !== '00000') {
          Notify({
            message: 'emial 寄送失敗',
            duration: 1000
          });
          return
        }
        Notify({
          type: 'success',
          message: 'emial 寄送成功',
          duration: 1000
        });
      })
      .catch((e) => {
        Notify({
          message: 'emial 寄送失敗',
          duration: 1000
        });
      })
    },
    copy() {},
    timeFormat: function(time) {
      if (!time) return '0000-00-00 00:00:00'
      const formattime = new Date(time * 1000).toISOString()
      return `${formattime.slice(0, 10)} ${formattime.slice(11, 19)}`
    }
  }
};
</script>

<style>
.wallet {
  margin: 50px 50px 0px 50px;
  font-size: 23px;
}
.guess-rule {
  font-size: 20px;
  border: black;
  border-style: inset;
  border-radius: 12px;
  padding: 12px;
}
.ellipsis-field {
  text-overflow: ellipsis;
  overflow: hidden;
  white-space: nowrap;
}
.guess-item {
  border: black;
  border-style: inset;
  border-radius: 12px;
  font-size: 25px;
  padding: 10px;
}
.mail-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}
.mail-block {
  font-size: 150%;
  margin-top: -800px;
  width: 400px;
  padding: 20px;
  background-color: #fff;
}
.drawn-link {
  color: blue;
  text-decoration: underline;
  margin-top: 60px;
}
</style>

