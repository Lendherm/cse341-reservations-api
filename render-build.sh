#!/bin/bash
echo "🚀 Starting build process on Render..."
echo "📦 Installing dependencies..."
npm install

# Run tests in CI mode
echo "🧪 Running tests..."
npm run test:ci

# Only continue if tests pass
if [ $? -eq 0 ]; then
  echo "✅ Tests passed! Build completed successfully!"
  exit 0
else
  echo "❌ Tests failed! Build cannot proceed."
  exit 1
fi