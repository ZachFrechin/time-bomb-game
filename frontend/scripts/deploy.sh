#!/bin/bash
set -e
echo "🚀 Déploiement de Time Bomb..."

if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé."
    exit 1
fi

if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé. Copie depuis .env.example..."
    cp .env.example .env
    echo "📝 Veuillez éditer le fichier .env avec vos valeurs de production."
    exit 1
fi

echo "🔄 Arrêt des conteneurs existants..."
docker-compose down 2>/dev/null || true

echo "🔨 Construction des images Docker..."
docker-compose build --no-cache

echo "▶️  Démarrage des services..."
docker-compose up -d

echo "🎉 Déploiement terminé !"
echo "🌐 Application disponible sur : http://localhost"
