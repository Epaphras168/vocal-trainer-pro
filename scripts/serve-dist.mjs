// node scripts/serve-dist.mjs [dir] [port]   -> preview a build with production headers
import { serveDist } from './dist-server.mjs';

const { url } = await serveDist({ dir: process.argv[2] ?? 'dist', port: Number(process.argv[3] ?? 4173) });
console.log(`serving on ${url}`);
