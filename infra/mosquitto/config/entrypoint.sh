#!/bin/sh
set -eu

RUNTIME_DIR="/mosquitto/runtime"
CERT_DIR="$RUNTIME_DIR/certs"
PLUGIN_DIR="$RUNTIME_DIR/plugins"
PASSWORD_FILE="$RUNTIME_DIR/admin-password.txt"
PLUGIN_CONFIG="$RUNTIME_DIR/dynamic-security.json"
PLUGIN_LINK="$PLUGIN_DIR/mosquitto_dynamic_security.so"
SERVER_CONF="$CERT_DIR/server.cnf"

mkdir -p "$CERT_DIR" "$PLUGIN_DIR" /mosquitto/data /mosquitto/log

PLUGIN_PATH="$(find /usr/lib -name 'mosquitto_dynamic_security.so' | head -n 1)"
if [ -z "$PLUGIN_PATH" ]; then
  echo "Unable to locate mosquitto_dynamic_security.so"
  exit 1
fi

cp "$PLUGIN_PATH" "$PLUGIN_LINK"
printf '%s\n' "${MQTT_DYNSEC_ADMIN_PASSWORD:-change-me}" > "$PASSWORD_FILE"

if [ ! -f "$CERT_DIR/ca.crt" ]; then
  openssl genrsa -out "$CERT_DIR/ca.key" 2048
  openssl req -x509 -new -nodes -key "$CERT_DIR/ca.key" -sha256 -days 3650 \
    -out "$CERT_DIR/ca.crt" -subj "/CN=KWHU Mosquitto CA"
fi

cat > "$SERVER_CONF" <<'EOF'
[req]
distinguished_name = req_distinguished_name
req_extensions = v3_req
prompt = no

[req_distinguished_name]
CN = mosquitto

[v3_req]
subjectAltName = @alt_names

[alt_names]
DNS.1 = mosquitto
DNS.2 = localhost
EOF

if [ ! -f "$CERT_DIR/server.crt" ]; then
  openssl genrsa -out "$CERT_DIR/server.key" 2048
  openssl req -new -key "$CERT_DIR/server.key" -out "$CERT_DIR/server.csr" -config "$SERVER_CONF"
  openssl x509 -req -in "$CERT_DIR/server.csr" -CA "$CERT_DIR/ca.crt" -CAkey "$CERT_DIR/ca.key" \
    -CAcreateserial -out "$CERT_DIR/server.crt" -days 825 -sha256 \
    -extensions v3_req -extfile "$SERVER_CONF"
fi

if [ ! -f "$PLUGIN_CONFIG" ]; then
  cat > "$PLUGIN_CONFIG" <<'EOF'
{}
EOF
  rm -f "$PLUGIN_CONFIG"
fi

exec /usr/sbin/mosquitto -c /mosquitto/config/mosquitto.conf
