# Reddit OAuth Setup Guide

## 🔧 **Reddit App Konfiguration**

### **1. Reddit App Settings aktualisieren:**

Gehe zu [Reddit App Preferences](https://www.reddit.com/prefs/apps) und aktualisiere deine App:

**Redirect URI:** 
```
https://thenewsppostspark.vercel.app/
```

**WICHTIG:** 
- Verwende **KEIN** `/webapp.html` am Ende
- Verwende **KEIN** `http://localhost` für Production
- Die URI muss **exakt** übereinstimmen

### **2. Korrekte Redirect URIs für verschiedene Umgebungen:**

#### **Production (Vercel):**
```
https://thenewsppostspark.vercel.app/
```

#### **Development (Local):**
```
http://localhost:8080/
```

#### **Staging (falls vorhanden):**
```
https://staging-postspark.vercel.app/
```

### **3. Reddit App Scopes:**

Stelle sicher, dass deine App diese Scopes hat:
- `identity` - Benutzer-Identität abrufen
- `submit` - Posts und Kommentare erstellen
- `edit` - Posts und Kommentare bearbeiten
- `read` - Posts und Kommentare lesen

### **4. Client ID und Secret:**

Die aktuellen Werte in `supabase-config.js`:
```javascript
CLIENT_ID: 'xnfBBEUETLqctZnhAka0DA'
CLIENT_SECRET: 'uLXMyoHsE8uQyZGhYW3ZMpbJ65BdHA'
```

### **5. OAuth Flow:**

1. **User klickt "Connect Reddit"**
2. **Redirect zu Reddit:** `https://www.reddit.com/api/v1/authorize?client_id=...&redirect_uri=https://thenewsppostspark.vercel.app/&response_type=code&scope=...&state=...`
3. **User autorisiert auf Reddit**
4. **Reddit redirects zurück zu:** `https://thenewsppostspark.vercel.app/?code=...&state=...`
5. **App verarbeitet den Callback** und speichert den Auth Code

### **6. Troubleshooting:**

#### **"invalid redirect_uri parameter" Fehler:**
- ✅ **Korrekt:** `https://thenewsppostspark.vercel.app/`
- ❌ **Falsch:** `https://thenewsppostspark.vercel.app/webapp.html`
- ❌ **Falsch:** `http://localhost:8080` (für Production)

#### **"redirect_uri_mismatch" Fehler:**
- Überprüfe, dass die URI in der Reddit App **exakt** der verwendeten entspricht
- Keine Trailing Slashes hinzufügen/entfernen
- HTTPS für Production verwenden

### **7. Testing:**

1. **Lokaler Test:**
   - Verwende `http://localhost:8080/` als Redirect URI
   - Teste den OAuth Flow lokal

2. **Production Test:**
   - Verwende `https://thenewsppostspark.vercel.app/` als Redirect URI
   - Teste auf der Live-Website

### **8. Code-Änderungen:**

Die folgenden Dateien wurden bereits aktualisiert:

#### **supabase-config.js:**
```javascript
REDIRECT_URI: window.VITE_REDDIT_REDIRECT_URI || 'https://thenewsppostspark.vercel.app/',
```

#### **webapp-script.js:**
- `handleRedditCallback()` Funktion hinzugefügt
- Automatische Callback-Behandlung beim Laden der Seite

### **9. Environment Variables (Optional):**

Du kannst auch Environment Variables verwenden:

```bash
VITE_REDDIT_REDIRECT_URI=https://thenewsppostspark.vercel.app/
```

## ✅ **Nach der Konfiguration:**

1. **Reddit App URI aktualisieren** auf `https://thenewsppostspark.vercel.app/`
2. **Code pushen** zu Vercel
3. **Testen** der Reddit-Verbindung
4. **"Connect Reddit" Button** sollte jetzt funktionieren

## 🚨 **Wichtige Hinweise:**

- **Reddit ist sehr strikt** mit Redirect URIs
- **Keine Wildcards** erlaubt
- **HTTPS erforderlich** für Production
- **Exakte Übereinstimmung** erforderlich
- **Keine Query Parameters** in der Redirect URI

## 📞 **Support:**

Falls weiterhin Probleme auftreten:
1. Überprüfe die Reddit App Settings
2. Teste mit verschiedenen Redirect URIs
3. Überprüfe die Browser-Konsole auf Fehler
4. Stelle sicher, dass die Domain korrekt ist
