const fsPromises = require('fs').promises;

const yaml = require('js-yaml');

const testObj = {
  a: 'b',
  c: 'd',
  e: [1, 2, 3, 4, 5],
};

const main = async () => {
  try {
    const openapi = await fsPromises.open('openapi.yaml', 'w');
    await openapi.write(yaml.safeDump(testObj));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

main();
