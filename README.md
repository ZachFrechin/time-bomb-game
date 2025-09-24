# Time Bomb - Jeu Multijoueur

Une implémentation web du jeu de société Time Bomb, permettant de jouer entre amis en ligne.

## 🎮 Description du jeu

Time Bomb est un jeu de déduction et de coopération où deux équipes s'affrontent :
- **Détectives (Sherlock)** : Doivent trouver tous les fils de désamorçage avant que la bombe explose
- **Saboteurs (Moriarty)** : Tentent de faire exploser la bombe

## 🚀 Fonctionnalités

- **Multijoueur en temps réel** avec WebSocket
- **Salles privées et publiques** avec codes de partage
- **Interface intuitive** avec des visuels clairs
- **Chat en temps réel** pendant les parties
- **Reconnexion automatique** en cas de déconnexion
- **QR Code** pour rejoindre facilement une partie
- **Responsive design** pour jouer sur mobile/tablette

## 🛠 Stack Technique

### Backend
- **Node.js** avec TypeScript
- **Express** pour l'API REST
- **Socket.IO** pour le temps réel
- **Redis** pour l'état des parties
- **PostgreSQL** pour la persistance (optionnel)
- **JWT** pour l'authentification

### Frontend
- **Vue 3** avec Composition API
- **Pinia** pour la gestion d'état
- **TypeScript** pour la sécurité des types
- **Tailwind CSS** pour le style
- **Vite** pour le build

### Infrastructure
- **Docker** & **Docker Compose** pour le déploiement
- **Nginx** comme proxy inverse

## 📦 Installation

### Prérequis
- Node.js 18+
- Docker & Docker Compose

### Développement

1. **Cloner le projet**
   ```bash
   git clone <url-du-repo>
   cd time_bombe
   ```

2. **Démarrer Redis et PostgreSQL**
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Backend**
   ```bash
   cd backend
   cp .env.example .env
   npm install
   npm run dev
   ```

4. **Frontend**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

5. **Accéder à l'application**
   - Frontend : http://localhost:5173
   - Backend API : http://localhost:3000

### Production

1. **Configurer l'environnement**
   ```bash
   cp .env.example .env
   # Éditer .env avec vos valeurs de production
   ```

2. **Démarrer avec Docker**
   ```bash
   docker-compose up -d
   ```

3. **Accéder à l'application**
   - Application : http://localhost (port 80)

## 🎯 Règles du jeu

### Objectifs
- **Détectives** : Trouver tous les fils de désamorçage (1 par joueur)
- **Saboteurs** : Faire couper le fil de la bombe

### Déroulement
1. Chaque joueur reçoit 5 fils face cachée devant lui
2. Les joueurs jouent chacun leur tour
3. Au tour d'un joueur, il choisit un fil chez un autre joueur à couper
4. Le fil révélé peut être :
   - **💣 Bombe** → Victoire des Saboteurs
   - **✅ Défuse** → Progression des Détectives
   - **✓ Neutre** → Aucun effet, tour suivant

### Distribution
- **4-8 joueurs** supportés
- **Répartition des rôles** : ~1/3 Saboteurs, ~2/3 Détectives
- **Fils** : 1 bombe, 1 défuse par joueur, le reste neutres

## 🔧 Configuration

### Variables d'environnement

**Backend (.env)**
```env
NODE_ENV=development
PORT=3000
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://timebomb:password@localhost:5432/timebomb
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:5173
```

**Production (docker-compose)**
```env
JWT_SECRET=your-super-secret-production-key
CORS_ORIGIN=https://yourdomain.com
NODE_ENV=production
```

## 🚀 Déploiement sur VPS

### Avec Docker

1. **Préparer le serveur**
   ```bash
   # Installer Docker
   curl -fsSL https://get.docker.com -o get-docker.sh
   sh get-docker.sh

   # Installer Docker Compose
   sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
   sudo chmod +x /usr/local/bin/docker-compose
   ```

2. **Transférer le code**
   ```bash
   scp -r . user@your-vps:/path/to/app/
   ```

3. **Configurer et démarrer**
   ```bash
   cd /path/to/app
   cp .env.example .env
   # Éditer .env avec vos valeurs

   docker-compose up -d
   ```

4. **Configurer Nginx (optionnel pour HTTPS)**
   ```nginx
   server {
       listen 80;
       server_name yourdomain.com;

       location / {
           proxy_pass http://localhost:80;
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
       }
   }
   ```

### Monitoring

**Vérifier le statut des services**
```bash
docker-compose ps
docker-compose logs -f backend
docker-compose logs -f frontend
```

**Redémarrer un service**
```bash
docker-compose restart backend
docker-compose restart frontend
```

## 🧪 Tests

### Backend
```bash
cd backend
npm run test
npm run lint
npm run typecheck
```

### Frontend
```bash
cd frontend
npm run test
npm run lint
npm run typecheck
```

## 📝 API Documentation

### Endpoints REST

- `POST /api/room/create` - Créer une salle
- `POST /api/room/join` - Rejoindre une salle
- `GET /api/room/:id/status` - Statut d'une salle
- `GET /api/rooms` - Liste des salles publiques
- `POST /api/auth/guest` - Authentification invité

### Events WebSocket

**Client → Serveur**
- `create_room` - Créer une salle
- `join_room` - Rejoindre une salle
- `start_game` - Démarrer la partie
- `cut_wire` - Couper un fil
- `send_chat` - Envoyer un message
- `kick_player` - Expulser un joueur

**Serveur → Client**
- `lobby_update` - Mise à jour du lobby
- `game_started` - Partie démarrée
- `private_hand` - Cartes privées du joueur
- `player_turn` - Tour d'un joueur
- `wire_cut_result` - Résultat d'un fil coupé
- `game_over` - Fin de partie
- `chat_message` - Message de chat

## 🔒 Sécurité

- **JWT** pour l'authentification
- **CORS** configuré pour la production
- **Validation** des données côté serveur
- **Rate limiting** pour les WebSockets
- **Sanitisation** des messages de chat

## 🐛 Résolution de problèmes

### Le backend ne démarre pas
- Vérifier que Redis est accessible
- Vérifier les variables d'environnement
- Consulter les logs : `docker-compose logs backend`

### Le frontend ne se connecte pas
- Vérifier la configuration du proxy Vite
- Vérifier les CORS du backend
- Consulter la console du navigateur

### Les parties ne se sauvegardent pas
- Vérifier la connexion Redis
- Vérifier la configuration PostgreSQL (si utilisé)

## 📄 Licence

Ce projet est sous licence MIT.

## 👥 Contribution

Les contributions sont les bienvenues ! Veuillez :
1. Fork le projet
2. Créer une branche feature
3. Commiter vos changements
4. Pousser vers la branche
5. Ouvrir une Pull Request