# Google Places API setup

One-time Google Cloud setup needed before the real (non-mocked) Google Places
sync ([project plan](./project-plan.md) §1.1–§1.5, backlog item "Data layer MVP")
can run against live data. None of this is code — it's Google Cloud Console
configuration.

## 1. Create (or pick) a Google Cloud project

Any Google account works — no special partner/business account required.

- Console home: https://console.cloud.google.com/
- Create a new project directly: https://console.cloud.google.com/projectcreate

## 2. Enable billing on the project

Google Places API is **pay-as-you-go per-SKU**, not a subscription — you're
billed based on which fields you request (Basic fields are cheapest; Contact
and Atmosphere fields cost significantly more per 1,000 calls, per README
§1.1). Billing still requires a payment method on file.

- Billing overview: https://console.cloud.google.com/billing
- Current pricing (check before assuming an old number/free-credit amount is
  still accurate): https://mapsplatform.google.com/pricing/

## 3. Enable the Places API (New)

The legacy Places API is being phased out — target the New Places API
endpoints (Text Search / Nearby Search / Place Details) for this sync.

- Enable it directly: https://console.cloud.google.com/apis/library/places.googleapis.com
- New Places API docs: https://developers.google.com/maps/documentation/places/web-service/overview
- Field masks (how to request only Basic fields for the sync, per README
  §1.1/§1.5): https://developers.google.com/maps/documentation/places/web-service/choose-fields

## 4. Create and restrict an API key

- Credentials page: https://console.cloud.google.com/apis/credentials
- Create an API key, then restrict it:
  - **API restriction:** limit it to "Places API (New)" only.
  - **Application restriction:** none of the usual options (HTTP referrer, iOS,
    Android) fit a server-side Netlify Scheduled Function well, since Netlify
    Functions don't have a fixed egress IP — so the restriction that matters
    most here is keeping the key server-side only (below), not an
    application restriction.

## 5. Set a budget alert

Cheap insurance against the "just grab everything" field-mask mistake README
§1.5 calls out as the most common way a small project blows its budget.

- Budgets & alerts: https://console.cloud.google.com/billing/budgets
- Set a threshold well below what you'd consider a surprise (e.g. a fraction
  of the monthly free credit), so an alert fires long before a real charge
  would.

## 6. Store the key server-side only

Add it to `apps/api/.env` (gitignored, same pattern as the Supabase
service-role key in `.env.example`):

```
GOOGLE_PLACES_API_KEY=<your key>
```

Never expose this key to `apps/web` or any browser-executed code — the sync
runs server-side only (a Netlify Scheduled Function per [project plan](./project-plan.md)
§9), so the key never needs to leave `apps/api`.
