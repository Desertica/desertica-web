import express from 'express';

/** Liveness probe for Docker and the platform: answers before Angular, so no render and no `NG_ALLOWED_HOSTS` check on `Host`. */
export function healthz(): express.RequestHandler {
  return (req, res, next) => {
    if (req.path !== '/healthz') {
      next();
      return;
    }

    res.set('Cache-Control', 'no-store').type('text/plain').send('ok');
  };
}
