#!/bin/bash
# Setup script for Ubuntu 22: Nginx for foxvote-frontend
# Usage: sudo bash setup_foxvote_frontend.sh <git_repo_url> <frontend_folder>

set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root (sudo)"
  exit 1
fi

if [ $# -ne 2 ]; then
  echo "Usage: $0 <git_repo_url> <frontend_folder>"
  echo "Example: $0 https://github.com/simontijanic/eksamen-2025-frontend.git /var/www/foxvote"
  exit 1
fi

GIT_REPO="$1"
FRONTEND_FOLDER="$2"

echo "=== Foxvote Frontend Setup Script ==="
echo "Repository: $GIT_REPO"
echo "Frontend folder: $FRONTEND_FOLDER"
echo

# 1. Oppdater systemet og installer nødvendige pakker
echo "1. Oppdaterer system og installerer avhengigheter..."
apt update && apt upgrade -y
apt install -y curl git nginx

# 2. Klon frontend-prosjektet
echo "2. Kloner frontend-prosjektet..."
if [ -d "$FRONTEND_FOLDER" ]; then
  echo "Mappe $FRONTEND_FOLDER finnes allerede. Sletter og kloner på nytt..."
  rm -rf "$FRONTEND_FOLDER"
fi

# Opprett parent-mappe hvis den ikke finnes
mkdir -p "$(dirname "$FRONTEND_FOLDER")"

# Backup plan for git clone
GIT_CLONE_ATTEMPTS=0
while [ $GIT_CLONE_ATTEMPTS -lt 2 ] && [ ! -d "$FRONTEND_FOLDER" ]; do
  GIT_CLONE_ATTEMPTS=$((GIT_CLONE_ATTEMPTS+1))
  echo "Kloner repo til $FRONTEND_FOLDER (forsøk $GIT_CLONE_ATTEMPTS)..."
  git clone "$GIT_REPO" "$FRONTEND_FOLDER" && break
  sleep 2
done

if [ ! -d "$FRONTEND_FOLDER" ]; then
  echo "Klarte ikke å klone repo etter flere forsøk. Avslutter."
  exit 1
fi

# 3. Sett riktige rettigheter på frontend-filene
echo "3. Setter riktige rettigheter..."
chown -R www-data:www-data "$FRONTEND_FOLDER"
chmod -R 755 "$FRONTEND_FOLDER"

# 4. Konfigurer Nginx for frontend
echo "4. Konfigurerer Nginx..."
cat > /etc/nginx/sites-available/foxvote-frontend <<EOL
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    
    server_name _;
    root $FRONTEND_FOLDER;
    index index.html index.htm;

    # Hovedside
    location / {
        try_files \$uri \$uri/ =404;
        
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
EOL

# 5. Aktiver nettsiden og fjern default nginx-side
echo "5. Aktiverer nettsiden..."
# Fjern default nginx-konfigurasjoner
rm -f /etc/nginx/sites-enabled/default
rm -f /etc/nginx/sites-available/default
rm -f /etc/nginx/sites-enabled/foxvote-api 2>/dev/null || true

# Aktiver frontend-konfigurasjonen
ln -sf /etc/nginx/sites-available/foxvote-frontend /etc/nginx/sites-enabled/

# 6. Test nginx-konfigurasjonen og restart
echo "6. Tester og restarter Nginx..."
if nginx -t; then
  systemctl restart nginx
  systemctl enable nginx
  echo "✓ Nginx konfigurert og startet!"
else
  echo "✗ Nginx-konfigurasjon feilet!"
  exit 1
fi

# 7. Konfigurer brannmur
echo "7. Konfigurerer brannmur..."
ufw --force enable
ufw allow 'Nginx Full'
ufw allow OpenSSH

echo
echo "=== Setup fullført! ==="
echo "Frontend kjører på: http://<server-ip>/"
echo "Dokumentasjon: http://<server-ip>/docs"
echo "Frontend-filer: $FRONTEND_FOLDER"
echo
echo "Nyttige kommandoer:"
echo "- Nginx status: sudo systemctl status nginx"
echo "- Nginx restart: sudo systemctl restart nginx"
echo "- Nginx logs: sudo tail -f /var/log/nginx/error.log"
echo "- Test nginx config: sudo nginx -t"
echo
echo "Hvis du oppdaterer frontend-koden:"
echo "- cd $FRONTEND_FOLDER && git pull"
echo "- sudo systemctl reload nginx"
