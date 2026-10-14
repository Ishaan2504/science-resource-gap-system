import { app } from './app';
import { env } from './config/env';
import { pool } from './db/pool';
import { startWorkers } from './jobs/worker';
import { jobs,redis } from './jobs/queue';

async function start(){
  const worker=await startWorkers().catch((e)=>{console.warn('[Server] Worker error:',e);return null;});
  const server=app.listen(env.port,'0.0.0.0',()=>process.stdout.write(`API listening on http://0.0.0.0:${env.port}\n`));
  const shutdown=async()=>{
    server.close();
    if(worker)await worker.close().catch(()=>undefined);
    if(jobs)await jobs.close().catch(()=>undefined);
    if(redis)await redis.quit().catch(()=>undefined);
    await pool.end().catch(()=>undefined);
    process.exit(0);
  };
  process.on('SIGINT',shutdown);process.on('SIGTERM',shutdown);
}
start().catch(error=>{console.error(error);process.exitCode=1;});
