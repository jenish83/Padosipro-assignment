import config from './config.js';
import { openDb } from './db.js';
import { createMailer } from './services/mailer.js';
import { createApp } from './app.js';

const db = openDb(config.dbPath);
const app = createApp({ db, mailer: createMailer() });

app.listen(config.port, '0.0.0.0', () => {
  console.log(`PadosiPro API listening on http://0.0.0.0:${config.port}  (mail: ${config.mail.transport})`);
});
