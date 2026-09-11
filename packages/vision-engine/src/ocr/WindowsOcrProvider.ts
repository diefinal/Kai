import { spawn } from 'child_process';
import { ImageFrame } from '../image/ImageFrame';
import { OcrProvider, OcrResult } from './OcrProvider';

/**
 * Windows OCR Provider using Windows.Media.Ocr WinRT API via PowerShell.
 * Suitable for Windows 10/11 native OCR without external binary dependencies.
 */
export class WindowsOcrProvider implements OcrProvider {
  /**
   * Helper to execute PowerShell scripts. Protected to allow mocking in unit tests.
   */
  protected async executeOcrScript(script: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const ps = spawn('powershell.exe', [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-Command',
        script,
      ]);

      let stdout = '';
      let stderr = '';

      ps.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      ps.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      ps.on('close', (code) => {
        if (code !== 0 && stderr.trim().length > 0) {
          reject(new Error(`PowerShell process exited with code ${code}: ${stderr}`));
        } else {
          resolve(stdout.trim());
        }
      });

      ps.on('error', (err) => {
        reject(err);
      });
    });
  }

  async recognize(image: ImageFrame): Promise<OcrResult[]> {
    if (!image || !image.data || image.data.length === 0 || image.width <= 0 || image.height <= 0) {
      return [];
    }

    const base64Data = Buffer.from(image.data).toString('base64');
    const psScript = `
Add-Type -AssemblyName System.Runtime.WindowsRuntime
$asTaskGeneric = ([System.WindowsRuntimeSystemExtensions].GetMethods() | ? { $_.Name -eq 'AsTask' -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq 'IAsyncOperation\`1' })[0]

function AwaitOperation($WinRtOp, $ResultType) {
    $asTask = $asTaskGeneric.MakeGenericMethod($ResultType)
    $netTask = $asTask.Invoke($null, @($WinRtOp))
    $netTask.Wait(-1) | Out-Null
    $netTask.Result
}

[Windows.Globalization.Language, Windows.Globalization, ContentType=WindowsRuntime] | Out-Null
[Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType=WindowsRuntime] | Out-Null
[Windows.Media.Ocr.OcrEngine, Windows.Media.Ocr, ContentType=WindowsRuntime] | Out-Null

$bytes = [Convert]::FromBase64String("${base64Data}")
$stream = New-Object System.IO.MemoryStream(,$bytes)
$randAccessStream = [System.IO.WindowsRuntimeStreamExtensions]::AsRandomAccessStream($stream)

$decoder = AwaitOperation ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($randAccessStream)) ([Windows.Graphics.Imaging.BitmapDecoder])
$softwareBitmap = AwaitOperation ($decoder.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])

$engine = [Windows.Media.Ocr.OcrEngine]::TryCreateFromUserProfileLanguages()
if ($null -eq $engine) {
    "[]"
    exit
}

$ocrResult = AwaitOperation ($engine.RecognizeAsync($softwareBitmap)) ([Windows.Media.Ocr.OcrResult])
$lines = @()
foreach ($line in $ocrResult.Lines) {
    $lines += @{
        text = $line.Text
        confidence = 0.95
        bounds = @{
            x = 0
            y = 0
            width = [int]$line.Words[0].BoundingRect.Width
            height = [int]$line.Words[0].BoundingRect.Height
        }
    }
}
$lines | ConvertTo-Json -Compress
`;

    try {
      const output = await this.executeOcrScript(psScript);
      if (!output || output === '[]' || output === 'null') {
        return [];
      }
      const parsed = JSON.parse(output);
      const list: any[] = Array.isArray(parsed) ? parsed : [parsed];
      return list.map((item) => ({
        text: item.text || '',
        confidence: typeof item.confidence === 'number' ? Math.max(0, Math.min(1, item.confidence)) : 0.9,
        bounds: {
          x: item.bounds?.x || 0,
          y: item.bounds?.y || 0,
          width: item.bounds?.width || 0,
          height: item.bounds?.height || 0,
        },
      }));
    } catch {
      return [];
    }
  }
}
