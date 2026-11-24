# Web app

The Next.js app for the collections check. It reads one file, `src/data/results.json`, which the pipeline writes (`.venv/bin/python pipeline/run.py --data raw --publish`). There is no database.

```bash
npm install
npm run dev
```

The project README, one folder up, explains what the tool does and where every number comes from.
