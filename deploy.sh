#!/bin/bash

set -e

echo "🚀 Déploiement de Time Bomb..."

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez l'installer d'abord."
    exit 1
fi

# Vérifier si le fichier .env existe
if [ ! -f ".env" ]; then
    echo "⚠️  Fichier .env non trouvé. Copie depuis .env.example..."
    cp .env.example .env
    echo "📝 Veuillez éditer le fichier .env avec vos valeurs de production avant de relancer le script."
    exit 1
fi

# Arrêter les conteneurs existants
echo "🔄 Arrêt des conteneurs existants..."
docker-compose down 2>/dev/null || true

# Construire les images
echo "🔨 Construction des images Docker..."
docker-compose build --no-cache

# Démarrer les services
echo "▶️  Démarrage des services..."
docker-compose up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut
echo "📊 Vérification du statut des services..."
docker-compose ps

# Afficher les logs
echo "📋 Logs des services (Ctrl+C pour quitter):"
echo "Backend logs: docker-compose logs -f backend"
echo "Frontend logs: docker-compose logs -f frontend"
echo "Redis logs: docker-compose logs -f redis"

# Test de santé
echo "🏥 Test de santé..."
if curl -f http://localhost/health &> /dev/null; then
    echo "✅ Application déployée avec succès !"
    echo "🌐 Accédez à votre application sur : http://localhost"
else
    echo "⚠️  L'application semble avoir des problèmes. Vérifiez les logs:"
    echo "docker-compose logs"
fi

echo "🎉 Déploiement terminé !"