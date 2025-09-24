git add -A
git commit -m "automated push"
git push
ssh debian@31.97.54.206
cd time-bomb-game
sudo docker compose down
./pull.sh
sudo ./deploy-vps.sh 
exit
