ZelkovaBot - Vercel Dashboard

Deploy this folder as a Vercel project.
This ZIP contains ONLY the dashboard frontend. API/Auth/Socket.IO are proxied to Wispbyte at http://78.154.103.43:9907.

IMPORTANT: after Vercel gives you the final domain, set Wispbyte REDIRECT_URI to: https://YOUR-DOMAIN.vercel.app/auth/callback
and set Discord Developer Portal OAuth2 Redirect URI to the same URL.
If the Wispbyte IP/port changes, edit vercel.json destinations.
