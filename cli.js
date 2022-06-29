#!/usr/bin/env node

const { request } = require('https');

try {
  require('dotenv');
} catch (e) {}


function main() {
  const envNames = ['JIRA_HOST', 'JIRA_USER', 'JIRA_TOKEN', 'PROJECT_KEY'];
  for (const name of envNames) {
    if (!process.env[name]) {
      console.error(`please set environment variable "${name}"`);
      return;
    }
  }

  const Config = envNames.reduce((acc, name) => ({
    ...acc,
    [name]: process.env[name],
  }), {});

  function base64(value) {
    return Buffer.from(value).toString('base64');
  }

  function credential(user, pass) {
    return base64([user, pass].join(':'));
  }

  function fetchJson(url) {
    return new Promise((resolve, reject) => {
      const cred = credential(Config.JIRA_USER, Config.JIRA_TOKEN);
      const req = request(url, {
        headers: {
          Authorization: `Basic ${cred}`,
          'Content-Type': 'application/json',
        }
      }, (res) => {
        if (res.statusCode !== 200) {
          return reject(new Error('wrong authentication'));
        }
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
        });
        res.on('end', () => {
          resolve(JSON.parse(data));
        });
      });
      req.on('error', reject);
      req.end();
    });
  }

  const fetchApi = path =>
    fetchJson(`https://${Config.JIRA_HOST}${path}`);

  fetchApi(`/rest/api/2/project/${Config.PROJECT_KEY}/statuses`)
    .then(json => json.map(({ statuses }) => statuses).flat())
    .then(statuses => statuses.reduce((map, s) => map.set(s.id, s), new Map))
    .then(statMap => {
      [...statMap.entries()]
        .forEach(([id, stat]) => console.log(id, stat.name))
    })
    .then(() => process.exit(0))
    .catch(e => {
      console.error(e.message);
      process.exit(1);
    });
}
main();