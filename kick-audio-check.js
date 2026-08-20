const https = require('https');
const url = 'https://kick.com/api/v1/channels/fabriuruguayo';
const options = {
  headers: {
    Accept: 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    Referer: 'https://kick.com/fabriuruguayo',
    Origin: 'https://kick.com',
  },
};

https.get(url, options, (res) => {
  console.log('status', res.statusCode);
  console.log('content-type', res.headers['content-type']);
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('keys', Object.keys(parsed));
      console.log('playback_url', parsed.playback_url);
      console.log('livestream hls_url', parsed.livestream?.hls_url);
      console.log('livestream source', parsed.livestream?.source);
      console.log('error', parsed.error);
      console.log('reference', parsed.reference);
      console.log('raw body prefix', data.slice(0, 1200));
    } catch (err) {
      console.error('parse error', err.message);
      console.error(data.slice(0, 1200));
    }
  });
}).on('error', (err) => {
  console.error('request error', err.message);
});
