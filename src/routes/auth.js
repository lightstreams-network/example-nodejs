const express = require('express');
const router = express.Router();
const _ = require('lodash');
const debug = require('debug')('fanbase:server');
const { Sequelize } = require('src/models');
const { badInputResponse, unauthorizedResponse, jsonResponse } = require('src/lib/responses');
const { jwtEncode } = require('src/services/session');
const { verifyUser, createUser, updateUser, UserServiceError } = require('src/services/user');

const userAttrFields = [
  'username',
  'password'
];

function extractRequestAttrs(req, fields) {
  const params = { ...req.body, ...req.query };
  return _.reduce(Object.keys(params), (result, key) => {
    if (fields.indexOf(key) !== -1) {
      result[key] = params[key];
    }
    return result;
  }, {});
}

router.post('/create-user', async (req, res, next) => {
  const attrs = extractRequestAttrs(req, userAttrFields);
  if (!attrs.username || !attrs.password) {
    next(badInputResponse());
    return;
  }

  try {
    const { account } = await gateway.user.signUp(attrs.password);
    const user = await createUser({
      username: attrs.username,
      password: attrs.password,
      ethAddress: account
    });
    res.send(jsonResponse({ user }));
  } catch ( err ) {
    if (err instanceof Sequelize.ValidationError) {
      const sequelizeValidationError = new Error(err.errors[0].message);
      sequelizeValidationError.status = 400;
      return next(sequelizeValidationError);
    } else {
      debug(err);
      next(err);
    }
  }
});

router.post('/authenticate', async (req, res, next) => {
  const attrs = extractRequestAttrs(req, userAttrFields);
  if (!attrs.username || !attrs.password) {
    next(badInputResponse());
    return;
  }

  try {
    const user = await verifyUser(attrs.username, attrs.password);
    const { token } = await gateway.user.signIn(user.eth_address, attrs.password);
    // @TODO: replace by session
    await updateUser(attrs.username, {
      leth_token: token
    });
    const authToken = jwtEncode({ id: user.id });
    res.json(jsonResponse({ token: authToken, user }));
  } catch ( err ) {
    if (err instanceof UserServiceError) {
      next(unauthorizedResponse(err.message));
      return;
    }
    if (err instanceof Sequelize.ValidationError) {
      const sequelizeValidationError = new Error(err.errors[0].message);
      sequelizeValidationError.status = 400;
      return next(sequelizeValidationError);
    }

    debug(err);
    next(err);
  }
});

module.exports = router;