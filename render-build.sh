#!/bin/bash
echo "🚀 Iniciando build en Render..."
echo "Timestamp: $(date)"

echo "📦 Versiones actuales:"
echo "   Node: $(node --version)"
echo "   NPM: $(npm --version)"

echo "📦 Instalando dependencias..."
npm install

echo "🔧 Configurando entorno..."
if [ "$RENDER" = "true" ]; then
  echo "✅ Entorno Render detectado"
  echo "🌍 Configurando NODE_ENV=production"
  export NODE_ENV=production
else
  echo "⚠️  No se detectó entorno Render"
  echo "🌍 NODE_ENV=${NODE_ENV:-development}"
fi

echo "🔍 Verificando variables de entorno críticas..."
if [ -z "$MONGODB_URI" ]; then
  echo "❌ ERROR: MONGODB_URI no está configurada"
  exit 1
fi

if [ -z "$SESSION_SECRET" ]; then
  echo "⚠️  ADVERTENCIA: SESSION_SECRET no está configurada"
  echo "   Usando secreto por defecto (no seguro para producción)"
fi

if [ -z "$GITHUB_CLIENT_ID" ] || [ -z "$GITHUB_CLIENT_SECRET" ]; then
  echo "⚠️  ADVERTENCIA: GitHub OAuth credentials no configuradas"
  echo "   La autenticación con GitHub no funcionará"
fi

echo "✅ Build completado exitosamente!"
echo ""
echo "📊 Resumen del build:"
echo "   Node version: $(node --version)"
echo "   NPM version: $(npm --version)"
echo "   Dependencies: $(ls -la node_modules | wc -l) archivos"
echo "   Environment: ${NODE_ENV:-development}"
echo "   Directory: $(pwd)"

exit 0