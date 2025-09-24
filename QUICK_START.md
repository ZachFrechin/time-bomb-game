# 🚀 Démarrage Rapide - Time Bomb

## Option 1: Développement Local

```bash
# Configuration initiale
./scripts/dev-setup.sh

# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

Accès: http://localhost:5173

## Option 2: Production avec Docker

```bash
# Configuration et déploiement
cp .env.example .env
# Éditer .env avec vos valeurs
./scripts/deploy.sh
```

Accès: http://localhost

## 🎮 Comment jouer

1. **Créer une partie** avec votre pseudo
2. **Partager le code** de salle avec vos amis
3. **Attendre 4-8 joueurs** dans le lobby
4. **Démarrer la partie** (maître de partie)
5. **Couper les fils** à tour de rôle
6. **Victoire** : Détectives trouvent tous les défuses OU Saboteurs font exploser la bombe

## ⚙️ Configuration Rapide

### Variables importantes (.env)
```env
JWT_SECRET=votre-clé-secrète-unique
CORS_ORIGIN=https://votre-domaine.com
NODE_ENV=production
```

### Ports par défaut
- Frontend: 5173 (dev) / 80 (prod)
- Backend: 3000
- Redis: 6379
- PostgreSQL: 5432

## 🛠️ Commandes Utiles

```bash
# Logs en temps réel
docker-compose logs -f

# Redémarrer un service
docker-compose restart backend

# Arrêter tout
docker-compose down

# Voir l'état des services
docker-compose ps
```

🎉 **Amusez-vous bien !**