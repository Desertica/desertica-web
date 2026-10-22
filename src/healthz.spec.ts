import express from 'express';
import { healthz } from './healthz';
import { type Started, startApp } from './testing-http';

describe('healthz', () => {
  let started: Started;
  afterEach(() => started.close());

  it('answers 200 for any Host and leaves other paths to the next handler', async () => {
    const app = express();
    app.use(healthz());
    app.use((_req, res) => res.status(404).send('next'));
    started = await startApp(app);

    const ok = await fetch(`${started.url}/healthz`, { headers: { host: 'not-allowed.example' } });
    expect(ok.status).toBe(200);
    expect(await ok.text()).toBe('ok');
    expect((await fetch(`${started.url}/`)).status).toBe(404);
  });
});
