# Remove a tarefa do agente de impressao (para de rodar em segundo plano).
# EXECUTE COMO ADMINISTRADOR.

$nome = "AgenteImpressaoPaoeMar"

$admin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $admin) {
    Write-Host "Abra o PowerShell como ADMINISTRADOR e rode de novo." -ForegroundColor Red
    exit 1
}

if (Get-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue) {
    Stop-ScheduledTask -TaskName $nome -ErrorAction SilentlyContinue
    Unregister-ScheduledTask -TaskName $nome -Confirm:$false
    Write-Host "Tarefa removida. O agente nao roda mais em segundo plano." -ForegroundColor Green
} else {
    Write-Host "A tarefa $nome nao esta instalada."
}
