# PostSpark Subscription System Setup

## Übersicht

Das komplette Subscription-System für PostSpark ist jetzt implementiert mit Digistore24 Integration. Es umfasst:

- **3 Pläne**: Starter (€9), Pro (€19), Enterprise (€49)
- **Plan-Limits**: Campaigns, Refreshes, Features
- **Paywall**: Für User ohne Subscription
- **Digistore24 IPN**: Automatische Subscription-Verwaltung
- **Upgrade-System**: Nahtlose Plan-Upgrades

## Setup-Schritte

### 1. Datenbank-Schema aktualisieren

Führe das neue Schema in deiner Supabase-Datenbank aus:

```sql
-- Führe subscription-schema.sql aus
```

### 2. Digistore24 IPN konfigurieren

In deinem Digistore24 Dashboard:

1. Gehe zu **Produkte** → **IPN (Instant Payment Notification)**
2. Setze die IPN-URL auf: `https://post-spark.com/api/digistore-ipn`
3. Aktiviere IPN für alle deine Produkte

### 3. Produkt-IDs (bereits konfiguriert)

- **Starter**: 643746
- **Pro**: 643752  
- **Enterprise**: 643754
- **Upgrade zu Pro**: 1322890
- **Upgrade zu Enterprise**: 1322889

### 4. Upgrade-URL

Die Upgrade-URL ist bereits konfiguriert:
`https://www.checkout-ds24.com/upgrade/13809-2qUXXN8CJg9P/BESTELLID`

## Features

### Plan-Limits

| Feature | Starter | Pro | Enterprise |
|---------|---------|-----|------------|
| Campaigns | 1 | 5 | 15 |
| Refreshes/Campaign | 10 | 10 | 10 |
| Refreshes/Monat | 10 | 50 | 150 |
| Analytics | Basic | Advanced | Full |
| Support | Email | Priority | 24/7 |
| API Access | ❌ | ❌ | ✅ |
| Custom Integrations | ❌ | ❌ | ✅ |

### Paywall-System

- **Automatische Erkennung**: User ohne Subscription sehen sofort die Paywall
- **Plan-Auswahl**: Schöne UI mit allen 3 Plänen
- **Direkte Weiterleitung**: Zu Digistore24 Checkout

### Subscription-Management

- **Settings-Seite**: Zeigt aktuellen Plan und Features
- **Upgrade-Buttons**: Direkte Weiterleitung zu Digistore24
- **Automatische Updates**: Via IPN-Calls

## Technische Details

### Dateien

- `subscription-schema.sql` - Datenbankschema
- `subscription-manager.js` - JavaScript Subscription-Manager
- `api/digistore-ipn.js` - IPN Handler für Digistore24
- `paywall-styles.css` - Paywall-Styling
- `webapp-script.js` - Integration in bestehende App

### IPN-Events

Der IPN-Handler verarbeitet:
- `subscription_created` - Neue Subscription
- `subscription_renewed` - Verlängerung
- `subscription_cancelled` - Kündigung
- `upgrade_*` - Plan-Upgrades

### Usage-Tracking

Automatisches Tracking für:
- Campaign-Erstellung
- Campaign-Refreshes
- API-Calls (Enterprise)

## Testing

### 1. Test-Subscription erstellen

```javascript
// In der Browser-Konsole
await window.subscriptionManager.initialize();
console.log('Current subscription:', window.subscriptionManager.currentSubscription);
```

### 2. Limits testen

- Erstelle mehr Campaigns als erlaubt
- Führe mehr Refreshes als erlaubt durch
- Überprüfe Paywall-Anzeige

### 3. IPN testen

- Verwende Digistore24 Test-Modus
- Überprüfe IPN-Logs in der Datenbank

## Wichtige Hinweise

### Sicherheit

- IPN-Handler validiert alle eingehenden Daten
- RLS-Policies schützen User-Daten
- Service-Key nur für IPN-Handler

### Performance

- Subscription-Checks werden gecacht
- Limits werden in Echtzeit validiert
- Usage-Tracking ist asynchron

### Monitoring

- IPN-Logs in `ipn_logs` Tabelle
- Usage-Tracking in `subscription_usage` Tabelle
- Subscription-Status in `user_subscriptions` Tabelle

## Troubleshooting

### Paywall wird nicht angezeigt

```javascript
// Prüfe Subscription-Status
await window.subscriptionManager.initialize();
console.log('Has subscription:', window.subscriptionManager.hasActiveSubscription());
```

### IPN funktioniert nicht

1. Prüfe IPN-URL in Digistore24
2. Überprüfe Vercel-Logs
3. Schaue in `ipn_logs` Tabelle

### Limits werden nicht erkannt

1. Prüfe Subscription-Status
2. Überprüfe Plan-Konfiguration
3. Schaue in `subscription_usage` Tabelle

## Nächste Schritte

1. **Datenbank-Schema ausführen**
2. **Digistore24 IPN konfigurieren**
3. **Test-Subscription erstellen**
4. **Alle Features testen**
5. **Live schalten**

Das System ist vollständig implementiert und bereit für den produktiven Einsatz! 🚀
