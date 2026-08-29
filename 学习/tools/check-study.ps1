param(
  [string]$Root = (Join-Path $PSScriptRoot "..")
)

$ErrorActionPreference = "Stop"

# 兼容旧入口：根目录内容中心负责 SQLite 单次索引与检查。
$drmeRoot = (Resolve-Path (Join-Path $PSScriptRoot "..\..")).Path
Push-Location $drmeRoot
try {
  bun run check:content
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

$voidTags = @("area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "param", "source", "track", "wbr")
$ignoredTags = @("math", "mrow", "mfrac", "msup", "msub", "msqrt", "mi", "mn", "mo", "mtext", "mtable", "mtr", "mtd", "munder", "mover", "munderover", "mfenced", "mstyle", "menclose", "ms")
$files = Get-ChildItem -LiteralPath $Root -Recurse -Filter *.html | Sort-Object FullName

if (-not $files) {
  Write-Error "No HTML files found"
  exit 1
}

$failed = $false
foreach ($file in $files) {
  $raw = Get-Content -LiteralPath $file.FullName -Raw -Encoding UTF8
  # Ignore script/style bodies so example strings are not mistaken for tags.
  $scan = [regex]::Replace($raw, '(?is)<script\b.*?</script\s*>|<style\b.*?</style\s*>', '')
  $ids = @{}
  $anchors = New-Object System.Collections.Generic.List[object]
  $external = New-Object System.Collections.Generic.HashSet[string]
  $stack = New-Object System.Collections.Generic.List[object]
  $errors = New-Object System.Collections.Generic.List[string]

  $tagMatches = [regex]::Matches($scan, '<(?!/?script\b|/?style\b)(/?)([A-Za-z][A-Za-z0-9:-]*)([^>]*)>', [System.Text.RegularExpressions.RegexOptions]::IgnoreCase)
  foreach ($match in $tagMatches) {
    $line = ($raw.Substring(0, $match.Index) -split "`n").Count
    $closing = $match.Groups[1].Value -eq "/"
    $tag = $match.Groups[2].Value.ToLowerInvariant()
    $attrs = $match.Groups[3].Value
    if ($tag -in $ignoredTags) { continue }

    if (-not $closing) {
      $idMatch = [regex]::Match($attrs, '\bid\s*=\s*"([^"]+)"', 'IgnoreCase')
      if ($idMatch.Success) {
        $id = $idMatch.Groups[1].Value
        if ($ids.ContainsKey($id)) {
          $errors.Add("line ${line}: duplicate id='$id' (first seen at line $($ids[$id]))")
        } else {
          $ids[$id] = $line
        }
      }

      $hrefMatch = [regex]::Match($attrs, '\bhref\s*=\s*"([^"]+)"', 'IgnoreCase')
      if ($hrefMatch.Success) {
        $href = $hrefMatch.Groups[1].Value
        if ($href.StartsWith("#") -and $href.Length -gt 1) {
          $anchors.Add([pscustomobject]@{ Name = $href.Substring(1); Line = $line })
        } elseif ($href -match '^https?://') {
          [void]$external.Add($href)
        }
      }

      if ($tag -notin $voidTags -and -not $attrs.TrimEnd().EndsWith('/')) {
        $stack.Add([pscustomobject]@{ Tag = $tag; Line = $line })
      }
    } elseif ($stack.Count -eq 0) {
      $errors.Add("line ${line}: unexpected closing tag </$tag>")
    } elseif ($stack[$stack.Count - 1].Tag -eq $tag) {
      $stack.RemoveAt($stack.Count - 1)
    } else {
      $top = $stack[$stack.Count - 1]
      $errors.Add("line ${line}: </$tag> does not match <$($top.Tag)> (opened at line $($top.Line))")
      $found = -1
      for ($i = $stack.Count - 1; $i -ge 0; $i--) {
        if ($stack[$i].Tag -eq $tag) { $found = $i; break }
      }
      if ($found -ge 0) { $stack.RemoveRange($found, $stack.Count - $found) }
    }
  }

  foreach ($unclosed in ($stack | Sort-Object Line -Descending)) {
    $errors.Add("<$($unclosed.Tag)> at line $($unclosed.Line) has no closing tag")
  }
  foreach ($anchor in $anchors) {
    if (-not $ids.ContainsKey($anchor.Name)) {
      $errors.Add("line $($anchor.Line): anchor #$($anchor.Name) has no target id")
    }
  }

  $rootPath = (Resolve-Path $Root).Path.TrimEnd('\') + '\'
  $relative = $file.FullName.Substring($rootPath.Length).Replace('\', '/')
  if ($errors.Count -gt 0) {
    $failed = $true
    Write-Output "FAIL $relative"
    $errors | ForEach-Object { Write-Output "  - $_" }
  } else {
    Write-Output "PASS $relative"
  }
  Write-Output "  ids=$($ids.Count) anchors=$($anchors.Count) external_links=$($external.Count)"
}

if ($failed) { exit 1 }
exit 0
