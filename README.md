Twilio Voice and Video Example
==============================

This application shows how to use twilio.js and twilio-video.js together. It
also includes a reproduction example for
[this GitHub issue](https://github.com/twilio/twilio-video.js/issues/98).

Install
-------

Run the following:

```
npm install
```

### TwiML Application

This application defines a GET endpoint, `/twiml`. You'll want to configure a
TwiML Application's Voice Request URL to use this endpoint. Save this TwiML
Application's SID for use in the next section. You also need to deploy this
application to a public address so that Twilio can make requests against it.
[ngrok](https://ngrok.com) is super-useful for this.

Start
-----

Run the following:

```
export ACCOUNT_SID=ACxxx
export AUTH_TOKEN=xxx
export API_KEY_SID=SKxxx
export API_KEY_SECRET=xxx
export APP_SID=APxxx
npm start
```

### Using ngrok

Once the application is started, run the following:

```
ngrok http 3000
```

Tests
-----

I used this application to test the issue described
[here](https://github.com/twilio/twilio-video.js/issues/98). The following
table summarizes my results.

| Which connection is made first? | Who initiates the Voice call? | Who connects to the Room first? | Did it work? |
| ------------------------------- | ----------------------------- | ------------------------------- | ------------ | 
| Voice                           | Firefox                       | Firefox                         | Yes          |
| Voice                           | Firefox                       | Chrome                          | Yes          |
| Voice                           | Chrome                        | Firefox                         | Yes          |
| Voice                           | Chrome                        | Chrome                          | Yes          |
| Video                           | Firefox                       | Firefox                         | Yes          |
| Video                           | Firefox                       | Chrome                          | Yes          |
| Video                           | Chrome                        | Firefox                         | Yes          |
| Video                           | Chrome                        | Chrome                          | Yes          |
