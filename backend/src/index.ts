// ESM + verbatimModuleSyntax
import express from 'express';
import type { Request, Response, NextFunction } from 'express';

const app = express();
const PORT = Number(process.env.PORT) || 4000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/healthz', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok' });
});

app.get('/', (_req: Request, res: Response) => {
  res.send('Backend up');
});

app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Not Found', path: req.path });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  res.status(500).json({ error: 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`Backend listening at http://localhost:${PORT}`);
});
