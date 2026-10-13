import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';
import { startWorkers } from './jobs/worker';
import { jobs,redis } from './jobs/queue';

async function start(){
  const server=app.listen(env.port,()=>process.stdout.write(`API listening on port ${env.port}\n`));
  const worker=await startWorkers();
  const shutdown=async()=>{
    server.close();
    if(worker) await worker.close();
    try { await jobs.close(); } catch {}
    try { await redis.quit(); } catch {}
    try { await pool.end(); } catch {}
    process.exit(0);
  };
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
start().catch(error=>{console.error(error);process.exitCode=1;});
