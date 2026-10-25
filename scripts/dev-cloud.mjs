import { createServer } from 'vite';

// Cloud development always uses isolated Demo data, even with an existing .env.
process.env.VITE_DEMO_MODE = 'true';
process.env.VITE_MAP_PROVIDER = 'osm';

const server = await createServer({
  server: { host: '0.0.0.0', port: 5173, strictPort: true },
});
await server.listen();
console.log('Road Tag cloud development — Demo mode');
server.printUrls();

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.once(signal, async () => {
    await server.close();
    process.exit(0);
  });
}
