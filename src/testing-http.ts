import express from 'express';
import type { Server } from 'node:http';
import type { AddressInfo } from 'node:net';

export type Started = { url: string; close: () => void };

/** Starts an Express app on a free port, for specs that need a real HTTP round trip. */
export async function startApp(app: express.Express): Promise<Started> {
  const server = await new Promise<Server>((resolve) => {
    const started = app.listen(0, '127.0.0.1', () => resolve(started));
  });
  return {
    url: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () => server.close(),
  };
}

export type Received = {
  method: string;
  url: string;
  headers: Record<string, string | string[] | undefined>;
  body: unknown;
};

/** A fake upstream that records what it receives and answers with `respond`. */
export async function startUpstream(
  respond: (received: Received) => { status: number; body?: unknown },
): Promise<Started & { received: Received[] }> {
  const received: Received[] = [];
  const app = express();
  app.use(express.json());
  app.use((req, res) => {
    const entry: Received = { method: req.method, url: req.url, headers: req.headers, body: req.body };
    received.push(entry);
    const answer = respond(entry);
    res.status(answer.status);
    if (answer.body === undefined) {
      res.end();
    } else {
      res.json(answer.body);
    }
  });
  return { ...(await startApp(app)), received };
}
