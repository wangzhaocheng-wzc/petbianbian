# 测试用户注册
$registerData = @{
    username = "testuser"
    email = "test@example.com"
    password = "test123456"
    confirmPassword = "test123456"
} | ConvertTo-Json

Write-Host "测试用户注册..." -ForegroundColor Green
Write-Host "发送数据: $registerData" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/register" -Method POST -Body $registerData -ContentType "application/json"
    Write-Host "注册成功!" -ForegroundColor Green
    Write-Host "响应状态: $($response.StatusCode)" -ForegroundColor Cyan
    Write-Host "响应内容: $($response.Content)" -ForegroundColor White
} catch {
    Write-Host "注册失败!" -ForegroundColor Red
    Write-Host "错误信息: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "错误详情: $errorContent" -ForegroundColor Red
    }
}

Read-Host "按任意键继续"