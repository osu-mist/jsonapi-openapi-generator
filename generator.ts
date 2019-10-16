const fsPromises = require('fs').promises;

import yaml from 'js-yaml';

const openapi: object = {
  openapi: '3.0.0',
  info: {
    description: 'REPLACEME',
    contact: {
      name: 'IS Data Architecture Team',
      url: 'https://is.oregonstate.edu/data-architecture',
      email: 'isdataarchitecture@oregonstate.edu',
    },
  },
  security: [
    {
      OAuth2: [
        'full',
      ],
    },
  ],
};

const main = async () => {
  try {
    const openapiFile = await fsPromises.open('openapi.yaml', 'w');
    await openapiFile.write(yaml.safeDump(openapi));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
