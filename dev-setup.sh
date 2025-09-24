#!/bin/bash

set -e

echo "🛠️  Configuration de l'environnement de développement..."

# Vérifier Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js n'est pas installé. Veuillez l'installer d'abord (version 18+)."
    exit 1
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js version 18+ requis. Version actuelle: $(node -v)"
    exit 1
fi

# Vérifier Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

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
echo ""
echo "🌐 URLs :"
echo "  Frontend: http://localhost:5173"
echo "  Backend API: http://localhost:3000"
echo "  Redis: localhost:6379"
echo "  PostgreSQL: localhost:5432"