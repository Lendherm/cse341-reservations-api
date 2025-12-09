#!/bin/bash
echo "🚀 Iniciando build en Render..."

echo "📦 Actualizando npm..."
npm install -g npm@latest

echo "📦 Instalando dependencias..."
npm install

echo "🔧 Configurando variables de entorno..."
if [ "$RENDER" = "true" ]; then
  echo "✅ Entorno Render detectado"
  echo "🌍 NODE_ENV=production"
  export NODE_ENV=production
fi

echo "✅ Build completado!"
echo ""
echo "📊 Información del build:"
echo "   Node version: $(node --version)"
echo "   NPM version: $(npm --version)"
echo "   Directorio: $(pwd)"
echo "   Archivos: $(find . -type f -name "*.js" | wc -l) archivos JavaScript"

exit 0