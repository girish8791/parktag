const apiKey = 'd2159df61af8f2d5df1da08b20a24a6a63c8b59261d559c6';
const apiToken = '063e82a6b61040294e6b3999f6b5dd1aefc0d7d6253a8cb8';
const accountSid = 'edittree2';

const url = `https://api.exotel.com/v1/Accounts/${accountSid}/Calls/connect`;

const params = new URLSearchParams({
  From: '+917017737354',
  CallerId: '08047284348',
  Url: `http://my.exotel.com/${accountSid}/exoml/start_voice/1282960`,
  CallType: 'trans',
});

const response = await fetch(url, {
  method: 'POST',
  headers: {
    'Authorization': 'Basic ' + Buffer.from(`${apiKey}:${apiToken}`).toString('base64'),
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  body: params,
});

console.log("HTTP Status:", response.status);
const text = await response.text();
console.log(text);