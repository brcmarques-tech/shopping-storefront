#!/bin/bash
# Setup inicial do shopping-storefront no Lightsail
# Rodar UMA VEZ como: bash ~/shopping-storefront/deploy/lightsail-setup.sh
# Pré-requisitos:
#   1. DNS A record: loja.bcmtech.com.br → 32.194.117.29 já propagado
#   2. Repo bcm-tech/shopping-storefront existe no GitLab com deploy key configurada

set -e

DOMAIN="loja.bcmtech.com.br"
COMPOSE_FILE="/home/ubuntu/docker-compose.prod.yml"
NGINX_CONF="/home/ubuntu/nginx/nginx.conf"
DEPLOY_SH="/home/ubuntu/deploy.sh"

echo "=== 1. Clonando repo do storefront ==="
if [ ! -d "/home/ubuntu/shopping-storefront" ]; then
  git clone git@gitlab.com:bcm-tech/shopping-storefront.git /home/ubuntu/shopping-storefront
  echo "Repo clonado em /home/ubuntu/shopping-storefront"
else
  echo "Repo já existe, pulando clone"
fi

echo ""
echo "=== 2. Adicionando serviço storefront ao docker-compose.prod.yml ==="
if grep -q "shopping-storefront\|storefront:" "$COMPOSE_FILE"; then
  echo "Serviço já existe, pulando"
else
  # Insere antes da linha 'volumes:'
  python3 - <<'PYEOF'
import re

with open('/home/ubuntu/docker-compose.prod.yml', 'r') as f:
    content = f.read()

service_block = """
  storefront:
    build:
      context: ./shopping-storefront
      args:
        NEXT_PUBLIC_API_URL: https://api.bcmtech.com.br/graphql
    container_name: shopping-storefront
    restart: unless-stopped
    ports:
      - "3005:3000"
    depends_on:
      - api

"""

# Insere antes de 'volumes:'
content = content.replace('\nvolumes:', service_block + '\nvolumes:', 1)

with open('/home/ubuntu/docker-compose.prod.yml', 'w') as f:
    f.write(content)

print("Serviço adicionado ao docker-compose.prod.yml")
PYEOF
fi

echo ""
echo "=== 3. Atualizando deploy.sh para suportar 'storefront' ==="
if grep -q "storefront" "$DEPLOY_SH"; then
  echo "deploy.sh já tem storefront, pulando"
else
  sed -i "s|superadmin) REPO_DIR=\"delivery-superadmin\" ;;|superadmin) REPO_DIR=\"delivery-superadmin\" ;;\n  storefront)   REPO_DIR=\"shopping-storefront\" ;;|" "$DEPLOY_SH"
  echo "deploy.sh atualizado"
fi

echo ""
echo "=== 4. Adicionando loja.bcmtech.com.br ao nginx.conf ==="
if grep -q "$DOMAIN" "$NGINX_CONF"; then
  echo "Domínio já existe no nginx.conf, pulando"
else
  python3 - <<PYEOF
domain = "$DOMAIN"

with open('$NGINX_CONF', 'r') as f:
    content = f.read()

# Adiciona ao server_name do bloco HTTP (porta 80)
content = content.replace(
    'server_name api.bcmtech.com.br shopping.bcmtech.com.br adminshopping.bcmtech.com.br shop.bcmtech.com.br;',
    f'server_name api.bcmtech.com.br shopping.bcmtech.com.br adminshopping.bcmtech.com.br shop.bcmtech.com.br {domain};'
)

# Adiciona bloco HTTPS antes do fechamento do http {}
https_block = '''
    server {
        listen 443 ssl;
        server_name ''' + domain + ''';
        ssl_certificate /etc/letsencrypt/live/''' + domain + '''/fullchain.pem;
        ssl_certificate_key /etc/letsencrypt/live/''' + domain + '''/privkey.pem;

        location / {
            proxy_pass http://storefront:3000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade \$http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host \$host;
            proxy_set_header X-Real-IP \$remote_addr;
            proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto \$scheme;
        }
    }
'''

# Insere antes do fechamento do http block (último })
last_brace = content.rfind('}')
content = content[:last_brace] + https_block + content[last_brace:]

with open('$NGINX_CONF', 'w') as f:
    f.write(content)

print("nginx.conf atualizado")
PYEOF
fi

echo ""
echo "=== 5. Recarregando nginx para servir acme-challenge ==="
docker compose -f "$COMPOSE_FILE" exec nginx nginx -s reload || docker compose -f "$COMPOSE_FILE" restart nginx

echo ""
echo "=== 6. Obtendo certificado SSL para $DOMAIN ==="
if [ -d "/etc/letsencrypt/live/$DOMAIN" ] || docker compose -f "$COMPOSE_FILE" run --rm certbot ls "/etc/letsencrypt/live/$DOMAIN" 2>/dev/null; then
  echo "Certificado já existe para $DOMAIN"
else
  docker compose -f "$COMPOSE_FILE" run --rm certbot certonly \
    --webroot \
    --webroot-path=/var/www/certbot \
    -d "$DOMAIN" \
    --email contato@bcmtech.com.br \
    --agree-tos \
    --non-interactive
  echo "Certificado emitido"
fi

echo ""
echo "=== 7. Build e start do storefront ==="
cd /home/ubuntu
docker compose -f docker-compose.prod.yml build storefront
docker compose -f docker-compose.prod.yml up -d storefront

echo ""
echo "=== 8. Reload final do nginx (ativa HTTPS) ==="
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

echo ""
echo "=== DONE ==="
echo "Storefront disponível em: https://$DOMAIN/loja/<slug>"
