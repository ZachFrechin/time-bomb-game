#!/bin/bash

# Script de déploiement pour VPS - Time Bomb sur port 63333

set -e

echo "🚀 Déploiement de Time Bomb sur VPS (port 63333)"

# Variables d'environnement
export POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-$(openssl rand -hex 32)}
export JWT_SECRET=${JWT_SECRET:-$(openssl rand -hex 32)}
export CORS_ORIGIN=${CORS_ORIGIN:-"http://$(hostname -I | awk '{print $1}'):63333"}
export VITE_API_URL=${VITE_API_URL:-"http://$(hostname -I | awk '{print $1}'):63333"}

# Créer le fichier .env si il n'existe pas
if [ ! -f .env ]; then
    echo "📝 Création du fichier .env"
    cat > .env << EOF
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
JWT_SECRET=$JWT_SECRET
CORS_ORIGIN=$CORS_ORIGIN
VITE_API_URL=$VITE_API_URL
EOF
    echo "✅ Fichier .env créé"
else
    echo "📝 Chargement du fichier .env existant"
    source .env
fi

# Arrêter les conteneurs existants
echo "🛑 Arrêt des conteneurs existants..."
docker-compose -f docker-compose.prod.yml down

# Construire et démarrer les conteneurs
echo "🔨 Construction des images Docker..."
docker-compose -f docker-compose.prod.yml build

echo "🚀 Démarrage des conteneurs..."
docker-compose -f docker-compose.prod.yml up -d

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier le statut
echo "✅ Vérification du statut..."
docker-compose -f docker-compose.prod.yml ps

# Afficher les logs
echo "📋 Logs récents:"
docker-compose -f docker-compose.prod.yml logs --tail=20

echo "✨ Déploiement terminé!"
echo "🌐 Application disponible sur : http://$(hostname -I | awk '{print $1}'):63333"
echo ""
echo "📝 Commandes utiles:"
echo "  - Voir les logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "  - Arrêter: docker-compose -f docker-compose.prod.yml down"
echo "  - Redémarrer: docker-compose -f docker-compose.prod.yml restart"
echo "  - Statut: docker-compose -f docker-compose.prod.yml ps"