# Roda o teste de ponta a ponta do portal num Edge headless (site servido localmente).
# Uso (PowerShell, na raiz do repositório):  .\ferramentas\testes\rodar_testes.ps1
# Saída: uma linha PASS/FAIL por verificação. O trabalho é feito por rodar_testes.py.
$env:PYTHONIOENCODING = "utf-8"
python "$PSScriptRoot\rodar_testes.py"
exit $LASTEXITCODE
