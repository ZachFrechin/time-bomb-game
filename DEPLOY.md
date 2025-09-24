# Déploiement Time Bomb sur VPS (Port 63333)

## Prérequis
- Docker et Docker Compose installés sur le VPS
- Port 63333 ouvert dans le firewall

## Installation rapide

1. **Cloner le projet sur le VPS:**
```bash
git clone <votre-repo> time_bombe
cd time_bombe
```

2. **Lancer le déploiement:**
```bash
./deploy-vps.sh
```

## Installation manuelle

1. **Créer le fichier .env:**
```bash
cat > .env << EOF
POSTGRES_PASSWORD=$(openssl rand -hex 32)
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGIN=http://votre-ip:63333
VITE_API_URL=http://votre-ip:63333
EOF
```

2. **Construire et lancer:**
```bash
docker-compose -f docker-compose.prod.yml up -d --build
```

## Vérification

- Application : http://votre-ip:63333
- Logs : `docker-compose -f docker-compose.prod.yml logs -f`
- Status : `docker-compose -f docker-compose.prod.yml ps`

## Installation PWA Mobile

1. Ouvrir http://votre-ip:63333 sur mobile
2. Sur iOS : Appuyer sur "Partager" > "Sur l'écran d'accueil"
3. Sur Android : Menu (3 points) > "Installer l'application"

## Commandes utiles

```bash
# Arrêter
docker-compose -f docker-compose.prod.yml down

# Redémarrer
docker-compose -f docker-compose.prod.yml restart

# Voir les logs
docker-compose -f docker-compose.prod.yml logs -f

# Nettoyer et reconstruire
docker-compose -f docker-compose.prod.yml down
docker system prune -a
docker-compose -f docker-compose.prod.yml up -d --build
```

## Sécurité

⚠️ **IMPORTANT** : Changez les valeurs dans .env :
- `POSTGRES_PASSWORD` : Mot de passe PostgreSQL
- `JWT_SECRET` : Clé secrète pour JWT
- Configurez un reverse proxy (nginx) avec SSL pour la production