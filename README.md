# La Carta Personalizada

## Despliegue en Cloudflare Pages

1. Sube a GitHub
2. Ve a pages.cloudflare.com → "Create a project" → "Connect to Git"
3. Selecciona el repo
4. Build settings:
   - Framework preset: Vite
   - Build command: `npm run build`
   - Build output directory: `dist`
5. En "Environment variables" agrega: `ANTHROPIC_API_KEY`
6. Deploy
