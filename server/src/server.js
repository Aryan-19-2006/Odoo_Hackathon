const path = require('node:path');
const { connectDatabase } = require('./config/database');
const { createApp } = require('./app');

async function start() {
  if (!process.env.MEMBER1_AUTH_MODULE) {
    throw new Error('MEMBER1_AUTH_MODULE must point to Member 1 authentication middleware');
  }
  const authModule = require(path.resolve(process.env.MEMBER1_AUTH_MODULE));
  if (typeof authModule.authenticate !== 'function') {
    throw new TypeError('Member 1 auth module must export an authenticate middleware');
  }

  await connectDatabase();
  const app = createApp({ authenticate: authModule.authenticate });
  const port = Number(process.env.PORT || 3000);
  return app.listen(port, () => {
    console.log(`Brightloop API listening on port ${port}`);
  });
}

if (require.main === module) {
  start().catch((error) => {
    console.error('Unable to start Brightloop API', error);
    process.exitCode = 1;
  });
}

module.exports = { start };
