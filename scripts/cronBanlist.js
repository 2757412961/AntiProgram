import cron from 'node-cron';
import { exec } from 'child_process';

console.log('[Cron] Banlist update scheduler initialized.');

cron.schedule('0 0 * * *', () => {
  exec('npm run update-banlist', (err, stdout) => console.log(stdout));
});
