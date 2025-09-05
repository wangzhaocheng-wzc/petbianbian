@echo off
echo 启动Redis服务...
docker run -d --name pet-health-redis -p 6379:6379 redis:7-alpine
echo Redis已启动在端口6379
pause