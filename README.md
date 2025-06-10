# Foxvote Frontend

Dette er frontend-applikasjonen for Foxvote-prosjektet - en webapplikasjon hvor brukere kan stemme på søte rever og se statistikk over de mest populære revene.

## 📁 Prosjektstruktur

```
frontend/
├── index.html              # Hovedside for avstemning
├── documentation.html      # Brukerveiledning og FAQ
├── README.md               # Denne filen
├── setup_foxvote_frontend.sh # Automatisk oppsett for Ubuntu
├── javascript/
│   └── script.js           # Hovedlogikk for frontend
├── styles/
│   └── style.css          # CSS-styling
└── docs/
    ├── brukerveiledning.md
    └── feilsoeking_faq.md
```

## 🚀 Rask oppsett med bash-script (Ubuntu 22.04)

### Automatisk installasjon:
```bash
# Last ned og gjør scriptet kjørbart
curl -O https://raw.githubusercontent.com/simontijanic/eksamen-2025-frontend/main/setup_foxvote_frontend.sh
chmod +x setup_foxvote_frontend.sh

# Kjør scriptet
sudo bash setup_foxvote_frontend.sh https://github.com/simontijanic/eksamen-2025-frontend.git /var/www/foxvote
```

### Hva scriptet gjør:
- ✅ Installerer Nginx
- ✅ Kloner frontend-koden fra GitHub
- ✅ Konfigurerer Nginx for å serve frontend
- ✅ Setter opp API-proxy til backend (port 3000)
- ✅ Aktiverer gzip-komprimering
- ✅ Legger til sikkerhetstiltak
- ✅ Konfigurerer brannmur (UFW)

### Etter installasjon:
- **Hovedside:** `http://<server-ip>/`
- **Dokumentasjon:** `http://<server-ip>/docs`
- **API-tilgang:** `http://<server-ip>/api/`

## 🛠 Manuell installasjon

### Forutsetninger:
- Ubuntu 22.04 eller nyere
- Nginx
- Tilgang til Foxvote API (backend)

### Steg-for-steg:

1. **Installer Nginx:**
   ```bash
   sudo apt update
   sudo apt install nginx
   ```

2. **Klon prosjektet:**
   ```bash
   git clone https://github.com/simontijanic/eksamen-2025-frontend.git /var/www/foxvote
   ```

3. **Sett rettigheter:**
   ```bash
   sudo chown -R www-data:www-data /var/www/foxvote
   sudo chmod -R 755 /var/www/foxvote
   ```

4. **Konfigurer Nginx:**
   ```bash
   sudo nano /etc/nginx/sites-available/foxvote-frontend
   ```
   Se [nginx-konfigurasjon](#nginx-konfigurasjon) under.

5. **Aktiver siden:**
   ```bash
   sudo rm /etc/nginx/sites-enabled/default
   sudo ln -s /etc/nginx/sites-available/foxvote-frontend /etc/nginx/sites-enabled/
   sudo nginx -t && sudo systemctl reload nginx
   ```

## ⚙️ Konfigurasjoner

### Nginx-konfigurasjon:
```nginx
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    root /var/www/foxvote;
    index index.html index.htm;

    # Hovedside
    location / {
        try_files $uri $uri/ =404;
        
        # Cache-headers for statiske filer
        location ~* \.(css|js|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Dokumentasjonsside
    location /docs {
        try_files /documentation.html =404;
    }

    # API proxy til backend
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Sikkerhetstiltak
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip-komprimering
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

## 🎨 Funksjonalitet

### Hovedfunksjoner:
- **👀 Vis to tilfeldige rever:** Henter bilder fra backend API
- **🗳️ Stemmegivning:** Klikk på "Velg denne" for å stemme
- **📊 Sanntidsstatistikk:** Viser stemmetall og toppliste
- **⏳ Cooldown-system:** 3 sekunder mellom hver stemme
- **📱 Responsivt design:** Fungerer på mobil, nettbrett og desktop

### Tekniske detaljer:
- **Frontend:** Vanilla JavaScript + Bootstrap 5
- **API-kommunikasjon:** Fetch API med error handling
- **Tilgjengelighet:** ARIA-attributter og tastaturnavigasjon
- **Ytelse:** Caching av statiske filer

## 🌐 API-integrasjon

Frontend kommuniserer med backend via følgende endepunkter:

| Endepunkt | Metode | Beskrivelse |
|-----------|--------|-------------|
| `/api/images` | GET | Hent to tilfeldige rev-bilder |
| `/api/vote` | POST | Registrer en stemme |
| `/api/stats` | GET | Hent toppliste og statistikk |

## 📱 Universell utforming

Applikasjonen følger prinsipper for universell utforming:

- **🔍 Skjermleservennlig:** ARIA-attributter og semantisk HTML
- **⌨️ Tastaturnavigasjon:** Full støtte for tastaturbruk
- **🎨 Kontrast:** God fargekontrast for lesbarhet
- **📏 Responsiv:** Tilpasser seg alle skjermstørrelser
- **🔄 Live-regioner:** Dynamiske oppdateringer varsles

## 🐛 Feilsøking

### Vanlige problemer:

1. **Bildene lastes ikke:**
   - Sjekk at backend API kjører på port 3000
   - Kontroller nettverkstilkobling

2. **Kan ikke stemme:**
   - Vent til cooldown-perioden (3 sek) er over
   - Sjekk API-tilkobling

3. **Nginx-feil:**
   ```bash
   sudo nginx -t                    # Test konfigurasjon
   sudo systemctl status nginx      # Sjekk status
   sudo tail -f /var/log/nginx/error.log  # Se logger
   ```

4. **API-proxy fungerer ikke:**
   - Kontroller at backend kjører på port 3000
   - Sjekk Nginx-konfigurasjon for `/api/` location

## 🔄 Oppdatering

For å oppdatere frontend-koden:

```bash
cd /var/www/foxvote
sudo git pull
sudo systemctl reload nginx
```

## 📋 Krav

### Minimum systemkrav:
- **Server:** Ubuntu 22.04+ (eller lignende Linux-distribusjon)
- **Webserver:** Nginx 1.18+
- **Backend:** Foxvote API (Node.js)
- **Nettleser:** Moderne nettlesere (Chrome 60+, Firefox 55+, Safari 12+)

### Avhengigheter:
- **Bootstrap 5.3.3** (CDN)
- **Foxvote Backend API**

## 📄 Lisens

MIT License

---

## 📞 Support

For spørsmål eller problemer:
- Se [dokumentasjon.html](./documentation.html) for brukerveiledning
- Sjekk [feilsøking og FAQ](./docs/feilsoeking_faq.md)
- Kontakt systemadministrator ved tekniske problemer