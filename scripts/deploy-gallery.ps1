param([switch]$SkipBuild)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$release = [DateTime]::UtcNow.ToString('yyyyMMddTHHmmssZ')
$stagingDirectory = Join-Path $projectRoot ".cache/gallery-deploy/$release"
$remoteDirectory = "/home/miku/.cache/cakeui-gallery/$release"

function Assert-CommandSuccess {
    if ($LASTEXITCODE -ne 0) { throw "Deployment command failed with exit code $LASTEXITCODE." }
}

Push-Location $projectRoot
try {
    if (-not $SkipBuild) {
        npm run build:demo
        Assert-CommandSuccess
    }
    else {
        npm run docs:check
        Assert-CommandSuccess
    }
    if (-not (Test-Path -LiteralPath 'demo-dist/index.html')) { throw 'Build the demo before deploying.' }
    foreach ($documentName in @('llms.txt', 'llms-full.txt')) {
        $builtDocument = Join-Path 'demo-dist' $documentName
        $sourceDocument = Join-Path 'public' $documentName
        if (-not (Test-Path -LiteralPath $builtDocument)) { throw "Missing $builtDocument. Rebuild the demo." }
        if ((Get-FileHash -LiteralPath $builtDocument).Hash -ne (Get-FileHash -LiteralPath $sourceDocument).Hash) {
            throw "Outdated $builtDocument. Rebuild the demo before deploying."
        }
    }
    New-Item -ItemType Directory -Path $stagingDirectory -Force | Out-Null
    tar -czf "$stagingDirectory/site.tar.gz" -C demo-dist .
    Assert-CommandSuccess
    ssh -o BatchMode=yes miku@vanillacake.cn "mkdir -p '$remoteDirectory'"
    Assert-CommandSuccess
    scp "$stagingDirectory/site.tar.gz" deploy/gallery.nginx.conf deploy/install-gallery.sh "miku@vanillacake.cn:$remoteDirectory/"
    Assert-CommandSuccess
    # Normalize line endings in case this checkout uses CRLF. Sudo asks interactively;
    # no password or private key is stored in the repository or deployment files.
    ssh -t miku@vanillacake.cn "sed -i 's/\r$//' '$remoteDirectory/install-gallery.sh' && bash -n '$remoteDirectory/install-gallery.sh' && sudo bash '$remoteDirectory/install-gallery.sh' '$release'"
    Assert-CommandSuccess
}
finally {
    Pop-Location
}
