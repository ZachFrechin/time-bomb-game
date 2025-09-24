#!/bin/bash

set -e

echo "🛠️  Configuration de l'environnement de développement..."

# Démarrer Redis et PostgreSQL pour le dev
echo "🐳 Démarrage de Redis et PostgreSQL..."
docker-compose -f docker-compose.dev.yml up -d

# Installer les dépendances backend
echo "📦 Installation des dépendances backend..."
cd backend
cp .env.example .env 2>/dev/null || true
npm install

# Installer les dépendances frontend
echo "📦 Installation des dépendances frontend..."
cd ../frontend
npm install

cd ..

echo "✅ Environnement de développement configuré !"
echo ""
echo "🚀 Pour démarrer le développement :"
echo "  Terminal 1 (Backend): cd backend && npm run dev"
echo "  Terminal 2 (Frontend): cd frontend && npm run dev"