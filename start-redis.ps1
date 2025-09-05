Write-Host "启动Redis服务..." -ForegroundColor Green
docker run -d --name pet-health-redis -p 6379:6379 redis:7-alpine
Write-Host "Redis已启动在端口6379" -ForegroundColor Green
Read-Host "按任意键继续"