# Supabase Edge Functions Setup

## 🚀 **Edge Functions für CORS-Problem beheben**

### **Schritt 1: Supabase CLI installieren**
```bash
npm install -g supabase
```

### **Schritt 2: Supabase Projekt verknüpfen**
```bash
supabase login
supabase link --project-ref ntutkssgqzqgmbvuwjqu
```

### **Schritt 3: Edge Functions deployen**
```bash
# Deploy campaigns function
supabase functions deploy campaigns

# Deploy posts function  
supabase functions deploy posts
```

### **Schritt 4: Environment Variables setzen**
In der Supabase Dashboard → Settings → Edge Functions:
- `SUPABASE_URL`: `https://ntutkssgqzqgmbvuwjqu.supabase.co`
- `SUPABASE_ANON_KEY`: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50dXRrc3NncXpxZ21idnV3anF1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA2NzIwODcsImV4cCI6MjA3NjI0ODA4N30.7sVEt76VK0INektXVqB5xsDnfQolW7Bzz0MeJ63CevE`

### **Schritt 5: Testen**
Nach dem Deploy sollten die CORS-Fehler verschwinden!

## 🔧 **Was die Edge Functions machen:**

### **Campaigns Function** (`/functions/v1/campaigns`)
- **GET**: Alle Campaigns für den User abrufen
- **POST**: Neue Campaign erstellen
- **PUT**: Campaign aktualisieren
- **DELETE**: Campaign löschen

### **Posts Function** (`/functions/v1/posts`)
- **GET**: Posts für eine Campaign abrufen
- **POST**: Neuen Post erstellen
- **PUT**: Post aktualisieren

## ✅ **Vorteile:**
- ✅ **Keine CORS-Probleme** mehr
- ✅ **Bessere Sicherheit** durch Server-side Authentication
- ✅ **Reddit Post-ID Generation** automatisch
- ✅ **Bessere Performance** durch Edge Functions

## 🚨 **Falls Probleme auftreten:**
1. **Check Supabase Dashboard** → Edge Functions
2. **Check Logs** in der Supabase Console
3. **Teste die Functions** direkt im Dashboard
