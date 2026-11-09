# Instala o agente de impressao como tarefa do Windows: roda escondido, sem janela,
# inicia sozinho quando o computador liga e reinicia se cair.
# EXECUTE COMO ADMINISTRADOR: botao direito no PowerShell > "Executar como administrador",
# depois:  cd "pasta\agente-impressao" ; .\instalar-servico.ps1

$ErrorActionPreference = "Stop"
$nome = "AgenteImpressaoPaoeMar"
$pasta = Split-Path -Parent $MyInvocation.MyCommand.Path

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
    Write-Host "Abra o PowerShell como ADMINISTRADOR e rode de novo." -ForegroundColor Red
    exit 1
}

if (-not (Test-Path "$pasta\.env")) {
    Write-Host "Falta o arquivo .env nesta pasta (copie o .env.example e preencha)." -ForegroundColor Red
    exit 1
}

$node = (Get-Command node -ErrorAction SilentlyContinue).Source
if (-not $node) {
    Write-Host "Node.js nao encontrado. Instale o Node 18 ou mais novo (https://nodejs.org)." -ForegroundColor Red
    exit 1
}
if ($node -like "*\Users\*") {
    Write-Host "Aviso: o Node esta dentro da pasta de um usuario ($node)." -ForegroundColor Yellow
    Write-Host "A tarefa roda como SISTEMA e pode nao conseguir abri-lo. O ideal e instalar o Node para todos os usuarios (Program Files)." -ForegroundColor Yellow
}

# Se ja existia, remove para recriar com as configuracoes atuais.
if (Get-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $nome -Confirm:$false
}

$acao = New-ScheduledTaskAction -Execute $node -Argument "`"$pasta\agente.mjs`"" -WorkingDirectory $pasta
$gatilho = New-ScheduledTaskTrigger -AtStartup
$principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -LogonType ServiceAccount -RunLevel Highest
$config = New-ScheduledTaskSettingsSet `
    -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable `
    -RestartCount 999 -RestartInterval (New-TimeSpan -Minutes 1) `
    -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew

Register-ScheduledTask -TaskName $nome -Action $acao -Trigger $gatilho -Principal $principal -Settings $config `
    -Description "Imprime os tickets do Pao e Mar (busca a fila no servidor)" | Out-Null
Start-ScheduledTask -TaskName $nome

Write-Host ""
Write-Host "Pronto! O agente de impressao agora roda escondido e inicia junto com o Windows." -ForegroundColor Green
Write-Host "Para acompanhar, abra o arquivo: $pasta\agente.log"
Write-Host "Para desinstalar: .\remover-servico.ps1 (como administrador)."
