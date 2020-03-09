const axios = require('axios');
const { ObjectID } = require('mongodb');
const dvalue = require('dvalue');
const Bot = require('./Bot');
const Utils = require('./Utils');
const CodeError = require('./CodeError');
const Code = require('./Code');

class Lotto extends Bot {
  constructor() {
    super();
    this.name = 'Lotto';
  }

  init({
    config, database, logger, i18n,
  }) {
    this.db = database.mongodb;
    return super.init({
      config, database, logger, i18n,
    });
  }


  getLottoNumber(hash, number) {
    const result = [];
    for (let i = hash.length - 1; i >= 0; i--) {
      result.push(parseInt(hash[i], 16));
      if (result.length >= number) break;
    }
    return result;
  }

  checkLottoNumberRepeat(numbers) {
    const lottoNumberPool = [...new Array(16)].map((item, i) => i + 1);
    const getNumber = (number) => {
      let itemBool = false;
      lottoNumberPool.forEach((element, index) => {
        if (Number(number) === Number(element)) {
          itemBool = true;
          lottoNumberPool.splice(index, 1);
        }
      });
      return itemBool;
    };

    for (let i = 0; i < numbers.length; i++) {
      const element = numbers[i];
      if (!getNumber(element)) return true;
    }
    return false;
  }


  async BuyLottoTicket({ body }) {
    const {
      numbers, currency, currencyBalance,
    } = body;
    if (currency !== 'hkx' || currency !== 'hkx') throw new CodeError({ message: 'invalid currency', code: Code.INVALID_CURRENCY });
    if (Number(currencyBalance) === 0 || Number(currencyBalance) % 10 !== 0) throw new CodeError({ message: 'invalid bet amount, 1/10hkx or 1/1usx', code: Code.INVALID_BET_AMOUNT });
    if (numbers.length === 0) throw new CodeError({ message: 'invalid bet numbers', code: Code.INVALID_BET_NUMBERS });
    numbers.forEach((element) => {
      if (element.length !== 5 || Number(element) < 0 || Number(element) > 15) throw new CodeError({ message: 'invalid bet numbers', code: Code.INVALID_BET_NUMBERS });
    });

    const stageHeight = await Utils.getStageHeight();
    const nowTime = Math.floor(Date.now() / 1000);

    const lotto = await this.db.collection('LottoTicket').insertOne({
      numbers, stageHeight, nowTime, type: '4+1', currency, currencyBalance,
    });
    const id = lotto.insertedId;

    // save to trust


    return {
      message: 'success',
      data: {
        id,
        nowTime,
      },
      code: Code.SUCCESS,
    };
  }


  drawn(userNumbers, correct) {
    const correctNumberPairs = dvalue.clone(correct);
    // match red ball
    let matchRedBall = 0;
    for (let i = 0; i < userNumbers.length; i++) {
      if (Number(userNumbers[i]) === Number(correctNumberPairs.superNumber)) {
        matchRedBall = 1;
        userNumbers.splice(i, 1);
        break;
      }
    }

    // match black ball
    let matchBlackBall = 0;
    for (let i = 0; i < userNumbers.length; i++) {
      const userNumber = userNumbers[i];
      for (let j = 0; j < correctNumberPairs.numbers.length; j++) {
        const correctNumber = correctNumberPairs.numbers[j];
        if (Number(userNumber) === Number(correctNumber)) {
          matchBlackBall += 1;
          correctNumberPairs.numbers.splice(j, 1);
          break;
        }
      }
    }

    if (matchBlackBall === 4 && matchRedBall === 1) return '特等獎';
    if (matchBlackBall === 3 && matchRedBall === 1) return '一等獎';
    if (matchBlackBall === 2 && matchRedBall === 1) return '二等獎';
    if (matchBlackBall === 4 && matchRedBall === 0) return '三等獎';
    if (matchBlackBall === 1 && matchRedBall === 1) return '四等獎';
    if (matchBlackBall === 0 && matchRedBall === 1) return '五等獎';
    return '未中獎';
  }

  async DrawnLottoTicket({ params }) {
    const { id } = params;
    if (!id) throw new CodeError({ message: 'invalid input', code: Code.INVALID_INPUT });
    const findLottoTicket = await this.db.collection('LottoTicket').findOne({ _id: new ObjectID(id) });
    if (!findLottoTicket) throw new CodeError({ message: 'lotto ticket not found', code: Code.LOTTO_TICKET_NOT_FOUND });

    // drawnStageHeight +5
    const drawnStageHeight = (Number(findLottoTicket.stageHeight) + 5).toString(16);
    let findDBStageHeight = await this.db.collection('StageHeight').findOne({ id: 0 });
    if (!findDBStageHeight) {
      const stageHeight = await Utils.getStageHeight();
      const timestamp = Math.floor(Date.now() / 1000);
      await this.db.collection('StageHeight').updateOne({ _id: 0 }, { $set: { stageHeight, timestamp } }, { upsert: true });
      findDBStageHeight = { stageHeight };
    }

    if (parseInt(findDBStageHeight.stageHeight, 16) < parseInt(drawnStageHeight, 16)) throw new CodeError({ message: 'lotto number not drawn yet', code: Code.LOTTO_NOT_DRAWN_YET });

    let findDrawnLotto = await this.db.collection('DrawnLotto').findOne({ stageHeight: drawnStageHeight }, { _id: 0 });
    if (!findDrawnLotto) {
      const { hash } = await Utils.getBlockHash(drawnStageHeight);
      const numbers = this.getLottoNumber(hash, 5);
      findDrawnLotto = {
        stageHeight: drawnStageHeight,
        superNumber: numbers[numbers.length - 1],
        numbers: numbers.splice(0, numbers.length - 1),
      };

      await this.db.collection('DrawnLotto').insertOne(findDrawnLotto);
    }

    const result = [];
    findLottoTicket.numbers.forEach((element) => {
      const payoffType = this.drawn(element, findDrawnLotto);
      result.push({ numbers: element, payoffType });
    });


    return {
      message: 'success',
      data: {
        drawn: findDrawnLotto,
        result,
      },
      code: Code.SUCCESS,
    };
  }


  async GetLottoNumber({ query }) {
    let { amount = 5 } = query;
    if (amount >= 5) amount = 5;
    const stageHeight = await Utils.getStageHeight();

    let findDrawnLotto = await this.db.collection('DrawnLotto').findOne({ stageHeight });
    if (!findDrawnLotto) {
      const { hash } = await Utils.getBlockHash(stageHeight);
      const numbers = this.getLottoNumber(hash, amount);

      findDrawnLotto = {
        stageHeight,
        superNumber: numbers[numbers.length - 1],
        numbers: numbers.splice(0, numbers.length - 1),
      };
      await this.db.collection('DrawnLotto').insertOne(findDrawnLotto);
    }

    return {
      success: true,
      data: {
        superNumber: findDrawnLotto.superNumber,
        numbers: findDrawnLotto.numbers,
      },
      message: '',
      code: Code.SUCCESS,
    };
  }
}

module.exports = Lotto;
