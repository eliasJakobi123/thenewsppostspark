# Vercel Environment Variables für Digistore24 IPN

Füge diese Environment Variables in deinem Vercel Dashboard hinzu:

## Required Environment Variables

```
DIGISTORE24_MERCHANT_ID=13809
DIGISTORE24_IPN_SECRET=ORA_digi_2025_s3cur3_ipn_X7kP9mQ4
SUPABASE_SERVICE_KEY=dein_supabase_service_key_hier
```

## Wie hinzufügen:

1. Gehe zu deinem Vercel Dashboard
2. Wähle dein Projekt aus
3. Gehe zu "Settings" → "Environment Variables"
4. Füge jede Variable hinzu:
   - **Name**: `DIGISTORE24_MERCHANT_ID`
   - **Value**: `13809`
   - **Environment**: Production, Preview, Development

   - **Name**: `DIGISTORE24_IPN_SECRET`
   - **Value**: `ORA_digi_2025_s3cur3_ipn_X7kP9mQ4`
   - **Environment**: Production, Preview, Development

   - **Name**: `SUPABASE_SERVICE_KEY`
   - **Value**: `dein_supabase_service_key_hier`
   - **Environment**: Production, Preview, Development

5. Klicke "Save"
6. Redeploy dein Projekt

## IPN URL für Digistore24:

```
https://deine-domain.vercel.app/api/digistore-ipn
```

## Testen:

Nach dem Deploy kannst du den IPN-Test in Digistore24 erneut ausführen.
