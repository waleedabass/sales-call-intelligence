# Generates a real, playable two-speaker sales call recording using
# Windows' built-in SAPI text-to-speech (System.Speech) — zero paid TTS API,
# same "generate a real sample asset locally" spirit as document-ai's
# sample-invoices/generate.py (reportlab). Requires the two default en-US
# desktop voices (Microsoft David Desktop / Microsoft Zira Desktop) that
# ship with Windows.
#
# Scripted to hit this project's demo scenario exactly: a security/
# compliance objection, a promised technical document (SOC 2 report +
# security whitepaper), a named competitor mention, and a concrete next
# step — the four signal types the extraction pipeline is built to catch.

Add-Type -AssemblyName System.Speech

$outDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$outWav = Join-Path $outDir "brightline-retail-demo.wav"
$tempDir = Join-Path $outDir "_tts_tmp"
New-Item -ItemType Directory -Force -Path $tempDir | Out-Null

# Common format across both voices so raw PCM segments concatenate cleanly.
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(
    22050, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono
)

$dialogue = @(
    @{ Speaker = "rep";      Text = "Hi Morgan, thanks for making time today. I know your team's been evaluating a few options, so I want to make sure we're focused on what matters most for Brightline." }
    @{ Speaker = "prospect"; Text = "Sure. Honestly we're pretty deep into a proof of concept with Parallax Analytics already, so I want to see what actually sets Cascade apart." }
    @{ Speaker = "rep";      Text = "Fair enough. Let's start with what's been the biggest headache with your current reporting stack." }
    @{ Speaker = "prospect"; Text = "Mainly the lag. Our merchandising team gets sales data almost a full day late, and by then a promotion's already underway." }
    @{ Speaker = "rep";      Text = "That's exactly the gap we close. Cascade streams point of sale data in near real time, so merchandising sees today's numbers today, not tomorrow." }
    @{ Speaker = "prospect"; Text = "Okay, that's useful. Before we go further though, I have to ask about security. We're a public retailer, so our security team is going to want to know exactly how you handle customer data. Are you SOC 2 compliant, and where is data actually stored?" }
    @{ Speaker = "rep";      Text = "Great question, and I'd rather be upfront now than surprise you later. We are SOC 2 Type Two certified, data is encrypted at rest and in transit, and we support region locked storage in the US. I don't have the full report memorized down to the clause, so let me send over our actual SOC 2 report and security whitepaper after this call so your team can review it directly." }
    @{ Speaker = "prospect"; Text = "That would help a lot. Our security review is usually the long pole, so the sooner we have that in hand, the better." }
    @{ Speaker = "rep";      Text = "Understood, I'll get that document to you by tomorrow morning." }
    @{ Speaker = "prospect"; Text = "Appreciate it. What about data residency for our EU stores specifically?" }
    @{ Speaker = "rep";      Text = "For EU based stores we can pin storage to an EU region as well, that's part of the same whitepaper." }
    @{ Speaker = "prospect"; Text = "Good. Assuming the security piece checks out, what would implementation actually look like on our end?" }
    @{ Speaker = "rep";      Text = "Typically four to six weeks. We'd connect directly to your existing point of sale and inventory systems, no rip and replace." }
    @{ Speaker = "prospect"; Text = "That's reasonable. I think the natural next step is getting our infrastructure lead on a call to go through the technical architecture in more detail." }
    @{ Speaker = "rep";      Text = "Let's do that. I'll set up a technical deep dive with your infrastructure lead for next week, and I'll have the security documentation to you well before then." }
    @{ Speaker = "prospect"; Text = "Sounds good. Send over some times and I'll get him on the calendar." }
    @{ Speaker = "rep";      Text = "Will do. Thanks for being direct about the Parallax comparison too, it's helpful to know what we're up against." }
    @{ Speaker = "prospect"; Text = "Of course. We just want to make the right call here." }
    @{ Speaker = "rep";      Text = "Understood. I'll follow up today with the SOC 2 report, the security whitepaper, and a few times for the technical deep dive next week." }
    @{ Speaker = "prospect"; Text = "Perfect, talk soon." }
)

function Get-PcmData([string]$wavPath) {
    $bytes = [System.IO.File]::ReadAllBytes($wavPath)
    # Walk RIFF subchunks to find "data" rather than assuming a fixed 44-byte header.
    $pos = 12
    while ($pos -lt $bytes.Length) {
        $chunkId = [System.Text.Encoding]::ASCII.GetString($bytes, $pos, 4)
        $chunkSize = [BitConverter]::ToInt32($bytes, $pos + 4)
        if ($chunkId -eq "data") {
            return $bytes[($pos + 8)..($pos + 8 + $chunkSize - 1)]
        }
        $pos += 8 + $chunkSize
    }
    throw "No data chunk found in $wavPath"
}

# SAPI voices output at wildly different native loudness (Zira clips to full
# scale while David peaks ~30k) — Gemini's audio transcription silently
# dropped every clipped/distorted Zira turn in an earlier run of this
# script. Normalize each line's peak to a fixed headroom so both voices are
# clean, undistorted 16-bit PCM before concatenating.
function Get-NormalizedPcm([byte[]]$pcm, [int]$targetPeak = 26000) {
    $sampleCount = $pcm.Length / 2
    $samples = New-Object int[] $sampleCount
    $peak = 1
    for ($i = 0; $i -lt $sampleCount; $i++) {
        $s = [BitConverter]::ToInt16($pcm, $i * 2)
        $samples[$i] = $s
        $abs = [math]::Abs($s)
        if ($abs -gt $peak) { $peak = $abs }
    }
    $scale = $targetPeak / $peak
    $out = New-Object byte[] $pcm.Length
    for ($i = 0; $i -lt $sampleCount; $i++) {
        $scaled = [int]([math]::Round($samples[$i] * $scale))
        if ($scaled -gt 32767) { $scaled = 32767 }
        if ($scaled -lt -32768) { $scaled = -32768 }
        $bytes = [BitConverter]::GetBytes([int16]$scaled)
        $out[$i * 2] = $bytes[0]
        $out[$i * 2 + 1] = $bytes[1]
    }
    return $out
}

Write-Host "Synthesizing $($dialogue.Count) lines..."
$segments = New-Object System.Collections.Generic.List[byte[]]
$silenceSampleCount = [int](22050 * 0.45)  # ~450ms of silence between turns, 16-bit mono @ 22050Hz
$silenceBytes = New-Object byte[] ($silenceSampleCount * 2)  # must be an even (whole-sample) byte count or every other concatenated segment's 16-bit alignment shifts by one byte

for ($i = 0; $i -lt $dialogue.Count; $i++) {
    $line = $dialogue[$i]
    $voiceName = if ($line.Speaker -eq "rep") { "Microsoft David Desktop" } else { "Microsoft Zira Desktop" }
    $tempPath = Join-Path $tempDir "line_$i.wav"

    $synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
    $synth.SelectVoice($voiceName)
    $synth.Rate = -1
    $synth.SetOutputToWaveFile($tempPath, $format)
    $synth.Speak($line.Text)
    $synth.Dispose()

    $segments.Add((Get-NormalizedPcm (Get-PcmData $tempPath)))
    if ($i -lt $dialogue.Count - 1) { $segments.Add($silenceBytes) }
}

$totalDataLen = ($segments | ForEach-Object { $_.Length } | Measure-Object -Sum).Sum
$sampleRate = 22050
$bitsPerSample = 16
$channels = 1
$byteRate = $sampleRate * $channels * ($bitsPerSample / 8)
$blockAlign = $channels * ($bitsPerSample / 8)

$stream = New-Object System.IO.FileStream($outWav, [System.IO.FileMode]::Create)
$writer = New-Object System.IO.BinaryWriter($stream)

$writer.Write([System.Text.Encoding]::ASCII.GetBytes("RIFF"))
$writer.Write([int32](36 + $totalDataLen))
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("WAVE"))
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("fmt "))
$writer.Write([int32]16)
$writer.Write([int16]1)  # PCM
$writer.Write([int16]$channels)
$writer.Write([int32]$sampleRate)
$writer.Write([int32]$byteRate)
$writer.Write([int16]$blockAlign)
$writer.Write([int16]$bitsPerSample)
$writer.Write([System.Text.Encoding]::ASCII.GetBytes("data"))
$writer.Write([int32]$totalDataLen)
foreach ($seg in $segments) { $writer.Write($seg) }

$writer.Close()
$stream.Close()
Remove-Item -Recurse -Force $tempDir

$durationSec = [math]::Round($totalDataLen / $byteRate, 1)
Write-Host "Wrote $outWav ($durationSec sec)"
