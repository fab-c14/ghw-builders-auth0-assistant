# 21. The Context-Preserving Assistant

Status: Submitted.

One Auth0 login covers both calls. The React page asks the first-party profile API for the city saved for that user, and the API then asks Open-Meteo for the forecast in that city.

- Domain: `dev-85sfso2plkov4xrh.us.auth0.com`
- Client ID: `9fGtCU1IKXmCrGb1Tn1BVoi8UsHJaZSC`
- API audience: `https://builders-week.local/profile`
- Callback: `http://localhost:3000`

```bash
npm install
npm run dev
npm run web
```

Open `http://localhost:3000` and log in.
