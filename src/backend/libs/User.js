const axios = require('axios');
const { ObjectID } = require('mongodb');
const dvalue = require('dvalue');
const Bot = require('./Bot');
const Utils = require('./Utils');
const CodeError = require('./CodeError');
const Code = require('./Code');

class User extends Bot {
  constructor() {
    super();
    this.name = 'User';
    this.lockQueue = [1];
    this.lockTimeout = -1;
  }

  init({
    config, database, logger, i18n,
  }) {
    this.db = database.mongodb;

    // check lock time out
    setInterval((() => {
      if (this.lockTimeout <= 0 && this.lockTimeout !== -1) {
        // ols session is expired
        this.lockQueue.shift();
        this.lockQueue.push(1);
        this.lockTimeout = -1;
      }

      if (this.lockTimeout !== -1) this.lockTimeout -= 1000;
    }), 1000);

    return super.init({
      config, database, logger, i18n,
    }).then(async () => {
      this.lottoAddress = await this.findOne({ key: 'lottoServiceAddress' });
      this.lottoToken = await this.findOne({ key: 'lottoServiceToken' });
      return this;
    });
  }

  async CheckPagePool({ ctx }) {
    if (!ctx.session.sessionID) {
      const id = this.lockQueue.shift();
      ctx.session.sessionID = id;
      if (!id) {
        // other connection is not close
        return Promise.resolve({
          success: false,
          message: 'server error(page lock)',
          data: {},
          code: Code.SERVER_ERROR,
        });
      }
      // set timeout
      this.lockTimeout = 16 * 15 * 1000 + 5 * 1000;
    }
    return Promise.resolve({
      success: true,
      message: 'success',
      data: {},
      code: Code.SUCCESS,
    });
  }


  async Register() {
    try {
      // create by keystone
      const url = `${this.config.microservice.keystone}/register`;
      let response = await axios.post(url, {
        userID: Utils.randomStr(16),
        password: Utils.randomStr(16),
        profile: {
          name: Utils.randomStr(16),
        },
      });

      let { code, profile } = response.data;
      if (code === 5) {
      // renew token
        const { serviceUserID, servicePassword } = this.config.base;
        const lottoModule = await this.getBot('Lotto');
        const loginResponse = await lottoModule.loginKeystone({ userID: serviceUserID, password: servicePassword });
        await this.write({
          key: 'lottoServiceToken',
          value: loginResponse.token,
        });

        // register again
        response = await axios.post(url, {
          userID: Utils.randomStr(16),
          password: Utils.randomStr(16),
          profile: {
            name: Utils.randomStr(16),
          },
        });
        code = response.data.code;
      }
      if (code === undefined || code !== 0) throw new CodeError({ message: `remote api error(create user error: ${response.data.message})`, code: Code.REMOTE_API_ERROR });

      const { address } = profile;
      const user = await this.db.collection('User').insertOne({
        apiKey: profile.apiKey,
        apiSecret: profile.apiSecret,
        address,
      });

      this.config.socket.on('depositing', async (msg) => {
        this.config.io.emit('depositing', { success: msg.success });
      });

      this.config.socket.emit('createDeposit', { type: 'create', data: { address } });
      this.config.socket.on('createDeposit', async (msg) => {
        if (msg.success) {
          await this.db.collection('User').updateOne({ _id: new ObjectID(user.insertedId) }, { $set: { currencySymbol: msg.assetSymbol, currencyID: msg.assetID } });
        }
        this.config.io.emit('checkDeposit', {
          success: msg.success,
          amount: msg.amount,
          address,
        });
      });

      return {
        success: true,
        message: 'success',
        data: {
          userID: user.insertedId,
          remittanceAddress: this.config.blockchain.watchWallet,
        },
        code: Code.SUCCESS,
      };
    } catch (e) {
      if (!Object.prototype.hasOwnProperty.call(e, 'success')) {
        this.logger.trace(`register server error(${e.message})`);
        return Promise.resolve({
          success: false,
          message: `server error(${e.message})`,
          data: {},
          code: Code.SERVER_ERROR,
        });
      }
      throw e;
    }
  }

  async GetUserInfo({ params }) {
    try {
      const { userID } = params;

      if (!userID) throw new CodeError({ message: 'invalid input', code: Code.INVALID_INPUT });
      const findUser = await this.db.collection('User').aggregate([
        { $match: { _id: new ObjectID(userID) } },
        {
          $lookup: {
            from: 'LottoTicket',
            localField: 'lottoList',
            foreignField: '_id',
            as: 'LottoTickets',
          },
        },
      ]).toArray();

      if (findUser.length === 0 || !findUser[0]) throw new CodeError({ message: 'user not found', code: Code.USER_NOT_FOUND });
      const balance = await this.getBalance({
        address: findUser[0].address,
        assetID: findUser[0].currencyID,
      });
      let findDBStageHeight = await this.db.collection('StageHeight').findOne({ _id: 0 });
      if (!findDBStageHeight) {
        const stageHeight = await Utils.getStageHeight();
        const timestamp = Math.floor(Date.now() / 1000);
        await this.db.collection('StageHeight').updateOne({ _id: 0 }, { $set: { stageHeight, timestamp } }, { upsert: true });
        findDBStageHeight = { stageHeight };
      }

      let lottoIssue = '0000000';
      const findLottoIssue = await this.db.collection('Counter').findOne({ _id: 'LottoIssue' });
      if (findLottoIssue)lottoIssue = findLottoIssue.counter;

      return {
        success: true,
        message: 'success',
        data: {
          balance,
          multipliers: findUser[0].multipliers,
          currencySymbol: findUser[0].currencySymbol,
          address: findUser[0].address,
          apiSecret: findUser[0].apiSecret,
          nowStageHeight: parseInt(findDBStageHeight.stageHeight, 16),
          nextLottoIssue: Utils.formateIssue(lottoIssue + 1),
          LottoTickets: findUser[0].LottoTickets,
        },
        code: Code.SUCCESS,
      };
    } catch (e) {
      if (!Object.prototype.hasOwnProperty.call(e, 'success')) {
        this.logger.trace(`GetUserInfo server error(${e.message})`);
        return Promise.resolve({
          success: false,
          message: `server error(${e.message})`,
          data: {},
          code: Code.SERVER_ERROR,
        });
      }
      throw e;
    }
  }

  async SendKeyToEmail({ params, query }) {
    try {
      const { userID } = params;
      const { to } = query;

      const findUser = await this.db.collection('User').findOne({ _id: new ObjectID(userID) });
      if (!findUser) throw new CodeError({ message: 'user not found', code: Code.USER_NOT_FOUND });

      const mailer = await this.getBot('Mailer');
      const subject = '<XGuess> 您的區塊遊戲卡';
      const content = `
    親愛的顧客您好:<br>
        感謝您使用 XGuess 遊戲卡，提醒您於活動期限內把握時機，即時參與遊戲！<br>
    發售面額：${findUser.totalAmount}${findUser.currency}<br>
    <br>
    <a href="https://xguess.boltchain.io/#/ticket/${userID}">查看我的遊戲卡</a><br>
    ------------<br>
    <a href="https://xguess.boltchain.io/#/">如何使用遊戲卡</a><br><br>
    感謝閣下的支持！<br><br>
    XGuess 團隊
    `;
      await mailer.send({ email: to, subject, content });

      return {
        success: true,
        message: 'success',
        data: {},
        code: Code.SUCCESS,
      };
    } catch (e) {
      this.logger.trace(`SendKeyToEmail server error(${e.message})`);
      return Promise.resolve({
        success: false,
        message: `server error(${e.message})`,
        data: {},
        code: Code.SERVER_ERROR,
      });
    }
  }

  async transfer({
    toAddress, assetID, amount, token,
  }) {
    let response = await axios.post(`${this.config.microservice.keychain}/sign`, {
      to: toAddress,
      assetID,
      value: String(amount),
    }, { headers: { token } });
    let { code } = response.data;
    if (code === 5) {
      // renew token
      const { serviceUserID, servicePassword } = this.config.base;
      const lottoModule = await this.getBot('Lotto');
      const loginResponse = await lottoModule.loginKeystone({ userID: serviceUserID, password: servicePassword });
      await this.write({
        key: 'lottoServiceToken',
        value: loginResponse.token,
      });

      // reTransfer again
      response = await axios.post(`${this.config.microservice.keychain}/sign`, {
        to: toAddress,
        assetID,
        value: String(amount),
      }, { headers: { token } });
      code = response.data.code;
    }
    if (code === undefined || code !== 0) throw new CodeError({ message: `remote api error(create user error: ${response.data.message})`, code: Code.REMOTE_API_ERROR });
    return {
      success: true,
    };
  }

  async getBalance({ address, assetID }) {
    const response = await axios.get(`${this.config.microservice.keychain}/balance?address=${address}&assetID=${assetID}`);
    return response.data.balance;
  }
}

module.exports = User;
