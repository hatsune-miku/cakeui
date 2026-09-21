#!/usr/bin/env bash
set -euo pipefail

if [[ ${EUID} -ne 0 ]]; then echo 'Run with sudo.' >&2; exit 1; fi
staging=$(realpath -- "${1:?Supply the uploaded setup directory}")
case "$staging" in /home/miku/.cache/cakeui-browser-setup/*) ;; *) echo 'Unexpected staging directory.' >&2; exit 1;; esac
key=$(tr -d '\r\n' < "$staging/deploy-key.pub")
if [[ ! $key =~ ^ssh-ed25519\ [A-Za-z0-9+/=]+\ cakeui-browser-deploy$ ]]; then echo 'Invalid deployment public key.' >&2; exit 1; fi

install -d -m 755 -o miku -g miku /var/www/html/cakeui-dist
install -d -m 755 /usr/local/libexec
install -m 755 "$staging/cakeui-dist-receive.py" /usr/local/libexec/cakeui-dist-receive
install -d -m 700 -o miku -g miku /home/miku/.ssh
touch /home/miku/.ssh/authorized_keys
chmod 600 /home/miku/.ssh/authorized_keys
chown miku:miku /home/miku/.ssh/authorized_keys
line="restrict,command=\"/usr/local/libexec/cakeui-dist-receive\" $key"
if ! grep -qF -- "$key" /home/miku/.ssh/authorized_keys; then printf '%s\n' "$line" >> /home/miku/.ssh/authorized_keys; fi

backup=$(mktemp -d /tmp/cakeui-nginx.XXXXXXXX)
trap 'rm -rf -- "$backup"' EXIT
cp /etc/nginx/sites-available/default "$backup/default"
if [[ -e /etc/nginx/snippets/cakeui-dist.conf ]]; then cp /etc/nginx/snippets/cakeui-dist.conf "$backup/snippet"; fi
install -m 644 "$staging/browser.nginx.conf" /etc/nginx/snippets/cakeui-dist.conf
# Add only this distribution location to the existing primary-domain HTTPS server.
python3 - <<'PY'
from pathlib import Path
path = Path('/etc/nginx/sites-available/default')
text = path.read_text()
marker = 'include /etc/nginx/snippets/cakeui-dist.conf;'
if marker not in text:
    anchor = 'root /var/www/html;'
    if text.count(anchor) != 1:
        raise SystemExit('Cannot uniquely identify the primary-domain server block')
    backup = path.with_name('default.before-cakeui-dist')
    if not backup.exists():
        backup.write_text(text)
    path.write_text(text.replace(anchor, anchor + '\n    ' + marker))
PY
if ! nginx -t; then
    cp "$backup/default" /etc/nginx/sites-available/default
    if [[ -e "$backup/snippet" ]]; then cp "$backup/snippet" /etc/nginx/snippets/cakeui-dist.conf; else rm -f /etc/nginx/snippets/cakeui-dist.conf; fi
    exit 1
fi
systemctl reload nginx
sudo -u miku /usr/local/libexec/cakeui-dist-receive check
