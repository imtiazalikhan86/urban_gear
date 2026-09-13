# Urban Gear Frontend

React PWA workspace for the reseller platform. It reuses the purchased template's visual language from `../WB095FRJM-v1-0-0/template/`: pink primary theme, Instrument Sans/Sora typography, rounded white cards, Material-style icon navigation, and mobile bottom navigation. The static HTML remains the asset/reference source while screens are migrated into React.

## Architecture

```text
pages/features -> components/ui -> services -> shared HTTP client
                         |
                     Redux Toolkit
```

Reference catalog visuals are stored under `public/reference/catalog/` and were sourced from the publicly referenced Total Gift Solutions corporate-gifting brochure/banner assets. API-provided product `imageUrl` values always take precedence over these fallback visuals.

## Run

From this directory:

```bash
npm install
npm run dev
```

The API defaults to `http://localhost:3000/api/v1`. Override with `VITE_API_URL`.
