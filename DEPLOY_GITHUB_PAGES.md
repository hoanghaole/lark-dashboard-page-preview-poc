# Deploy to GitHub Pages

## Steps

1. Create a GitHub repo, for example:
   `lark-dashboard-page-preview-poc`

2. Push this local repo:

```bash
git remote set-url origin https://github.com/<owner>/lark-dashboard-page-preview-poc.git
git push -u origin main
```

If current branch is `master`, either push master or rename:

```bash
git branch -M main
git push -u origin main
```

3. In GitHub repo settings:
   `Settings → Pages → Source → GitHub Actions`

4. Open deployed URL:

```txt
https://<owner>.github.io/lark-dashboard-page-preview-poc/?url=https%3A%2F%2Fexample.com
```

## Notes
- `vite.config.ts` uses `process.env.GITHUB_REPOSITORY` to set the correct Pages base path.
- The app supports standalone preview via `?url=<encoded_url>`.
- Lark Base custom page registration still needs Lark UI/API support; GitHub Pages gives us a public app URL first.
