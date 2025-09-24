Prompt complet à donner à Claude Code

Objet : Développer une application web multijoueur Time Bomb (jeu de cartes) — Node.js backend + WebSocket, Vue.js frontend — déploiement sur VPS

Contexte rapide (à inclure dans la réponse)

Cible : une application web hébergée sur mon VPS pour jouer entre amis.

Stack technique : Backend Node.js (TypeScript préféré mais JS possible), WebSocket (socket.io ou ws), Base : Redis (pour état temps réel / rooms) + PostgreSQL pour persistance facultative, Frontend Vue 3 (Composition API) + Pinia pour l’état.

L’objectif du prompt : produire le code complet (backend + frontend), tests et instructions de déploiement (Dockerfile, docker-compose, script de démarrage sur VPS).

1) Spécifications fonctionnelles — vue utilisateur (workflow d’une partie)

Décris précisément le workflow que l’application doit respecter.

Page d’accueil

Bouton Créer une partie et Rejoindre une partie (via code de salon ou liste publique).

Option pour choisir pseudo (obligatoire) et avatar (optionnel).

Création d’une partie (créateur = maître de partie)

Créateur crée un salon avec options : nombre max de joueurs (min 4, max 8), mode public/privé, règles variantes (si activées), timer par phase (optionnel).

Lors de la création, serveur génère un roomId (8 caractères) et QR/link partageable.

Salon d’attente (lobby)

Tous les joueurs attendent. Le créateur (maître) voit la liste des joueurs et peut :

Kick un joueur avant le début,

Paramétrer les règles (changer nombre de cartes, timer),

Démarrer la partie.

Le site adapte automatiquement la distribution des rôles et le paquet de cartes en fonction du nombre de joueurs (règles officielles Time Bomb) : par ex. 4 joueurs = X bomb cards, Y defuse cards, Z safe cards. (Adapter automatiquement les counts).

Démarrage de la partie

Quand le maître démarre, serveur lock la room et bascule l’état à in_game.

Serveur distribue secrètement : 1 carte rôle par joueur (Sherlock / Moriarty selon table), et 5 wire cards par joueur selon règles. Les wire cards sont ensuite placées face cachée devant chaque joueur et réordonnées.

Tour par tour / phase de jeu

Le jeu se déroule en rounds (max 4 rounds selon règles) : chaque tour, le joueur actif choisit une carte (un fil) devant un autre joueur à couper.

Quand une carte est coupée, son type (Safe / Defuse / Bomb) est révélé et l’effet appliqué (ex : si Bomb -> Moriarty gagne immédiatement; si Defuse trouvé suffisamment -> Sherlock gagne).

Server calcule et diffuse l’état actualisé à tous.

Fin de partie

Serveur déclare gagnant (Sherlock ou Moriarty), enregistre le match si demandé, et propose rematch ou quitter la room.

Reconnexion / déconnexion

Si un joueur se déconnecte avant le début : il peut rejoindre via roomId si place libre.

Si en partie : prévoir timeout short (ex : 60s) pour reconnexion. Si non reconnection -> remplacer par IA basique (optionnel) ou skip leur tour (selon config).

2) Backend — architecture et responsabilités

Donne une description technique claire de ce que doit faire le backend.

Tech & modules recommandés

Node.js + TypeScript (ts-node pour dev), framework HTTP : Express ou Fastify.

WebSockets : socket.io (gestion rooms, reconnection automatique) ou ws (si plus léger). Privilégier socket.io pour simplicité.

Redis :

Stockage temporaire des rooms et état de jeu (expirable),

Pub/Sub pour scaler entre processus si plusieurs instances (cluster).

PostgreSQL :

Persistance des utilisateurs (optionnel), historique des parties, statistiques.

Docker pour packaging.

Endpoints HTTP (REST)

POST /api/room/create -> body: { displayName, options } -> returns { roomId, tokenMaster }

POST /api/room/join -> body: { roomId, displayName } -> returns { success, socketToken }

GET /api/room/:roomId/status -> état public du lobby

POST /api/auth/guest -> créer pseudo temporaire (facultatif)

NB : l’authentification peut être simple (JWT signé pour socket handshake).

Events WebSocket (noms, payloads)

Fournis la liste complète d’événements émis/écoutés par le serveur et le client, avec exemples JSON.

Côté client → serveur

create_room { displayName, options } → réponse room_created

join_room { roomId, displayName } → réponse joined_room ou join_error

start_game { roomId, masterToken } → réponse game_started

cut_wire { roomId, playerIdTarget, wireIndex } → réponse wire_cut_result

send_chat { roomId, message } → broadcast chat_message

kick_player { roomId, playerId } (autorisé seulement au master)

Côté serveur → client (broadcasts)

lobby_update { roomId, players: [...], options }

game_started { roomId, initialState (non secret info for all) }

private_hand (emit to single socket) { roleCard, wireCardsFront }

player_turn { playerId }

wire_cut_result { cutterId, targetId, wireIndex, cardType, newGameState }

game_over { winnerTeam, summary }

error { code, message }

Inclure aussi reconnect_success / reconnect_failed.

Structures de données (exemples)

Donne des schémas JSON précis:

Room: