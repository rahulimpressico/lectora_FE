#!/bin/sh
set -eu

: "${BACKEND_HOST:=host.docker.internal:8000}"

export BACKEND_HOST

envsubst '${BACKEND_HOST}' < /etc/nginx/templates/nginx.conf.template > /etc/nginx/conf.d/default.conf

exec nginx -g 'daemon off;'
