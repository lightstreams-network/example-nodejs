const express = require('express');
const router = express.Router();
const _ = require('lodash');
const debug = require('debug')('app:server');
const { weiToPht } = require('src/lib/ethereum');
const { extractRequestAttrs, validateRequestAttrs } = require('src/lib/request');
const { badInputResponse, jsonResponse } = require('src/lib/responses');

const session = require('src/services/session').passport();
const gateway = require('src/services/gateway').gateway();
const Web3 = require('src/services/web3');
const faucetSC = require('src/smartcontracts/faucet');

router.get('/balance', session.authenticate('jwt', { session: false }),
  async (req, res, next) => {
    try {
      const { balance } = await gateway.wallet.balance(req.user.eth_address);
      res.json(jsonResponse({
        pht: weiToPht(balance),
        wei: balance
      }));
    } catch ( err ) {
      debug(err);
      next(err);
    }
  });

router.post('/request-top-up', session.authenticate('jwt', { session: false }), async (req, res, next) => {
  const query = ['amount'];
  try {
    validateRequestAttrs(req, query);
  } catch ( err ) {
    next(badInputResponse(err.message));
    return;
  }

  try {
    const attrs = extractRequestAttrs(req, query);
    await faucetSC.requestFreeToken(await Web3(), {
      beneficiary: req.user.eth_address,
      amountInPht: attrs.amount
    });
    const { balance } = await gateway.wallet.balance(req.user.eth_address);
    res.json(jsonResponse({
      pht: weiToPht(balance),
      wei: balance
    }));
  } catch ( err ) {
    debug(err);
    next(err);
  }
});

module.exports = router;