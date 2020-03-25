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
  }

  init({
    config, database, logger, i18n,
  }) {
    this.db = database.mongodb;
    return super.init({
      config, database, logger, i18n,
    }).then(async () => {
      this.lottoAddress = await this.findOne({ key: 'lottoServiceAddress' });
      this.lottoToken = await this.findOne({ key: 'lottoServiceToken' });
      return this;
    });
  }


  async Register({ body }) {
    try {
      const { amount, currency } = body;
      if (!Utils.isValidNumber(amount) || (currency !== 'USX' && currency !== 'HKX')) throw new CodeError({ message: 'invalid input', code: Code.INVALID_INPUT });
      const assetAddress = await this.findOne({ key: `${currency}Address` });
      if (!assetAddress) throw new CodeError({ message: `currency(${currency}) not found`, code: Code.CURRENCY_NOT_FOUND });

      // create by keystone
      const url = `${this.config.microservice.keystone}/register`;
      const response = await axios.post(url, {
        userID: Utils.randomStr(16),
        password: Utils.randomStr(16),
        profile: {
          name: Utils.randomStr(16),
        },
      });

      const { code, profile } = response.data;
      if (code === undefined || code !== 0) throw new CodeError({ message: `remote api error(create user error: ${response.data.message})`, code: Code.REMOTE_API_ERROR });
      const { address } = profile;

      // transfer currency to user address
      const transferRs = await this.transfer({
        toAddress: address, assetID: assetAddress, amount, token: this.lottoToken,
      });
      if (!transferRs.success) throw transferRs;

      const user = await this.db.collection('User').insertOne({
        apiKey: profile.apiKey,
        apiSecret: profile.apiSecret,
        address: profile.address,
        currency,
        totalAmount: String(amount),
      });

      return {
        success: true,
        message: 'success',
        data: {
          userID: user.insertedId,
          address: profile.address,
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
      const balance = await this.getBalance({ address: findUser[0].address, symbol: findUser[0].currency });
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
          currency: findUser[0].currency,
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
      const subject = '<XGuess> 您的區塊鏈遊戲卡';
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
    const response = await axios.post(`${this.config.microservice.keychain}/sign`, {
      to: toAddress,
      assetID,
      value: String(amount),
    }, { headers: { token } });
    const { code } = response.data;
    if (code === undefined || code !== 0) throw new CodeError({ message: `remote api error(create user error: ${response.data.message})`, code: Code.REMOTE_API_ERROR });
    return {
      success: true,
    };
  }

  async getBalance({ address, symbol }) {
    const assetID = await this.findOne({ key: `${symbol.toUpperCase()}Address` });
    const response = await axios.get(`${this.config.microservice.keychain}/balance?address=${address}&assetID=${assetID}`);
    return response.data.balance;
  }
}

module.exports = User;
