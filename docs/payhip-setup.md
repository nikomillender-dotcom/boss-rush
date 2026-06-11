# Payhip setup — Meow Rush: Gauntlet

Everything in the code is already built and wired up. You just need to:
1. Have a Payhip product with **license keys** enabled
2. Grab 2 values from Payhip (API key + product link)
3. Paste 4 environment variables into Vercel

Total time: about 15 minutes.

---

## Step 1 — Your Payhip store and product

Your store is at **https://payhip.com/NJMVentures** (this is what the in-game buy
button links to via `VITE_PAYHIP_CHECKOUT_URL`).

Create (or open) the product for the full game:

1. In Payhip, go to **Products** and add/open the full-game product
2. Price: whatever you are charging
3. Under the product's settings, enable **Software license keys**
   - This is what lets players paste a key in-game to unlock after buying

---

## Step 2 — Get your product link (permalink slug)

The license API checks keys against a specific product, not the whole store.

1. Open the product, then **Share / View**
2. The product URL looks like `https://payhip.com/b/SLUG` — copy the **`SLUG`** part
   (the value after `/b/`). That is your `PAYHIP_PRODUCT_LINK`.

---

## Step 3 — Get your API key

1. In Payhip, go to **Account settings > API**
2. Copy your secret API key (keep it private — it is server-only)

---

## Step 4 — Set environment variables in Vercel

Open your Boss Rush project → **Settings > Environment Variables**.
Add these for **Production** (and Preview if you want):

| Variable | Value |
|----------|-------|
| `PAYHIP_API_KEY` | Your secret API key from Step 3 |
| `PAYHIP_PRODUCT_LINK` | The product slug from Step 2 |
| `JWT_SECRET` | 32+ random bytes (keep your existing value if already set) |
| `VITE_PAYHIP_CHECKOUT_URL` | `https://payhip.com/NJMVentures` (or a direct product link) |

**IMPORTANT:** `PAYHIP_API_KEY` and `JWT_SECRET` are secrets — never commit them or
share them. `JWT_SECRET` signs the license tokens so the game knows a purchase is real;
keep the same value you already use so existing unlocked players stay unlocked.

---

## Step 5 — Redeploy

After saving the env vars, redeploy in Vercel so the new values are picked up
(**Deployments** tab → latest deployment → **Redeploy**).

---

## How it works once live

1. Player hits floor 100, sees the paywall screen inside the game
2. They click the buy button, get taken to your Payhip store
3. They pay, Payhip emails them a license key
4. They come back to the game, click "Have a key?", paste the key
5. The game calls `/api/validate-key`, which verifies the key with Payhip's License API
   (`license/verify`, checking `data.enabled`) and returns a signed JWT
6. The token is stored in their browser and they get full access immediately

---

## If something does not work

- Buy button goes nowhere: check `VITE_PAYHIP_CHECKOUT_URL` is set and you redeployed
- "Have a key?" says `not_configured` (503): `PAYHIP_API_KEY` or `JWT_SECRET` is missing in Vercel
- "Have a key?" says invalid for a real key: confirm `PAYHIP_PRODUCT_LINK` is the correct
  product slug and that license keys are enabled on that product
- Works locally but not in production: confirm the env vars are set for **Production**, not just Development
