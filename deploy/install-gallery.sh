#!/usr/bin/env bash
set -euo pipefail

release="${1:?A release timestamp is required}"
[[ "$release" =~ ^[0-9]{8}T[0-9]{6}Z$ ]] || exit 2
[[ "$EUID" -eq 0 ]] || { echo 'Run with sudo.' >&2; exit 2; }
stage="/home/miku/.cache/cakeui-gallery/$release"
base=/var/www/cakeui-gallery
site=/etc/nginx/sites-available/cakeui-gallery
enabled=/etc/nginx/sites-enabled/cakeui-gallery
domain=gallery.vanillacake.cn

test -f "$stage/site.tar.gz"
test -f "$stage/gallery.nginx.conf"
nginx -t
if [[ -e "$site" ]]; then
    grep -q '^# CakeUI gallery' "$site" || { echo 'The site config is owned by another deployment.' >&2; exit 1; }
fi
if [[ -e "$enabled" || -L "$enabled" ]]; then
    [[ "$(readlink "$enabled")" == "$site" ]] || { echo 'Unexpected enabled site path.' >&2; exit 1; }
fi

install -d -m 755 "$base/releases" "$base/assets" /var/www/letsencrypt/.well-known/acme-challenge
test ! -e "$base/releases/$release"
install -d -m 755 "$base/releases/$release"
tar --extract --gzip --file "$stage/site.tar.gz" --directory "$base/releases/$release" --no-same-owner
test -s "$base/releases/$release/index.html"
test -s "$base/releases/$release/llms.txt"
test -s "$base/releases/$release/llms-full.txt"
test -d "$base/releases/$release/assets"
find "$base/releases/$release" -type d -exec chmod 755 {} +
find "$base/releases/$release" -type f -exec chmod 644 {} +
cp -a "$base/releases/$release/assets/." "$base/assets/"

previous=$(readlink "$base/current" || true)
if [[ -e "$base/current" && ! -L "$base/current" ]]; then
    echo 'The current release path must be a symlink.' >&2
    exit 1
fi
if [[ -f "$site" ]]; then
    cp "$site" "$stage/nginx.previous.conf"
fi

function restore_previous() {
    if [[ -n "$previous" ]]; then
        ln -s "$previous" "$base/.rollback-$release"
        mv -Tf "$base/.rollback-$release" "$base/current"
    fi
    if [[ -f "$stage/nginx.previous.conf" ]]; then
        install -m 644 "$stage/nginx.previous.conf" "$site"
        nginx -t && systemctl reload nginx
    fi
}
trap restore_previous ERR

ln -s "$base/releases/$release" "$base/.current-$release"
mv -Tf "$base/.current-$release" "$base/current"

# Bootstrap HTTP for the first HTTP-01 challenge without touching other vhosts.
if [[ ! -e "$site" ]]; then
    cat > "$site" <<'NGINX'
# CakeUI gallery — temporary HTTP setup for Certbot
server {
    listen 80;
    listen [::]:80;
    server_name gallery.vanillacake.cn;
    root /var/www/cakeui-gallery/current;
    index index.html;
    location ^~ /.well-known/acme-challenge/ {
        root /var/www/letsencrypt;
        default_type text/plain;
        try_files $uri =404;
    }
    location / { try_files $uri $uri/ /index.html; }
}
NGINX
    ln -s "$site" "$enabled"
    nginx -t
    systemctl reload nginx
fi

certbot certonly --webroot --webroot-path /var/www/letsencrypt \
    --cert-name "$domain" --domain "$domain" --non-interactive \
    --agree-tos --keep-until-expiring \
    --deploy-hook '/usr/sbin/nginx -t -q && /usr/bin/systemctl reload nginx'

install -m 644 "$stage/gallery.nginx.conf" "$site"
nginx -t
systemctl reload nginx
curl --fail --silent --show-error --retry 5 --retry-delay 1 --retry-all-errors \
    --retry-max-time 20 --connect-timeout 5 --max-time 10 --noproxy '*' \
    --resolve "$domain:443:127.0.0.1" "https://$domain/" -o /dev/null
for document in llms.txt llms-full.txt; do
    curl --fail --silent --show-error --connect-timeout 5 --max-time 10 --noproxy '*' \
        --resolve "$domain:443:127.0.0.1" "https://$domain/$document" \
        -D "$stage/$document.headers" -o "$stage/$document.response"
    grep -qi '^Content-Type: text/plain; charset=utf-8' "$stage/$document.headers"
    cmp "$base/current/$document" "$stage/$document.response"
done
missing_status=$(curl --silent --show-error --connect-timeout 5 --max-time 10 --noproxy '*' \
    --resolve "$domain:443:127.0.0.1" "https://$domain/llms-missing.txt" -o /dev/null -w '%{http_code}')
[[ "$missing_status" == 404 ]]
trap - ERR
echo "Deployed $release to https://$domain"
openssl x509 -in "/etc/letsencrypt/live/$domain/fullchain.pem" -noout -subject -issuer -dates
