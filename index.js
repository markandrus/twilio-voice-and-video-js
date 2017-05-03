'use strict';

const express = require('express');
const app = express();

const { AccessToken, Capability, TwimlResponse } = require('twilio');
const { VideoGrant } = AccessToken;

const DEFAULT_IDENTITY = 'Anonymous';
const DEFAULT_PORT = 3000;
const STATIC = 'public';

const accountSid = process.env.ACCOUNT_SID;
const authToken = process.env.AUTH_TOKEN;
const apiKeySid = process.env.API_KEY_SID;
const apiKeySecret = process.env.API_KEY_SECRET;
const appSid = process.env.APP_SID;
const port = process.env.PORT || DEFAULT_PORT;

app.use(express.static(STATIC));

app.get('/tokens', (req, res) => {
  const identity = req.query.identity || DEFAULT_IDENTITY;
  res.json(makeTokens(identity));
});

app.get('/twiml', (req, res) => {
  const callerId = req.query.From;
  const to = req.query.to;
  const twiml = new TwimlResponse();
  twiml.dial({ callerId }, node => node.client(to));
  res.type('application/xml');
  res.send(twiml.toString());
});

app.listen(port);

/**
 * @interface Tokens
 * @property {string} accessToken
 * @property {string} capabilityToken
 */

/**
 * @param {string} token
 * @returns {Tokens}
 */
function makeTokens(identity) {
  return {
    accessToken: makeAccessToken(identity),
    capabilityToken: makeCapabilityToken(identity)
  }
}

/**
 * @param {string} identity
 * @returns {string}
 */
function makeAccessToken(identity) {
  const token = new AccessToken(accountSid, apiKeySid, apiKeySecret);
  const videoGrant = new VideoGrant();
  token.addGrant(videoGrant);
  token.identity = identity;
  return token.toJwt();
}

/**
 * @param {string} identity
 * @returns {string}
 */
function makeCapabilityToken(identity) {
  const token = new Capability(accountSid, authToken);
  token.allowClientIncoming(identity);
  token.allowClientOutgoing(appSid);
  return token.generate();
}
