import { spawn } from 'child_process';
import { NativeProvider, MousePosition, ScreenCapture } from './NativeProvider';
import { WindowInfo } from '../window/Window';

/**
 * C# source code using P/Invoke to declare Windows User32 APIs:
 * - EnumWindows
 * - GetWindowTextW
 * - GetWindowTextLengthW
 * - GetWindowThreadProcessId
 * - IsWindowVisible
 * - GetForegroundWindow
 * - GetWindowRect
 */
const WIN32_HELPER_CS = `
using System;
using System.Text;
using System.Collections.Generic;
using System.Runtime.InteropServices;

public class Win32WindowDto {
    public string id { get; set; }
    public string title { get; set; }
    public int processId { get; set; }
    public string processName { get; set; }
    public int x { get; set; }
    public int y { get; set; }
    public int width { get; set; }
    public int height { get; set; }
    public bool isVisible { get; set; }
    public bool isForeground { get; set; }
}

public class Win32NativeApi {
    public delegate bool EnumWindowsProc(IntPtr hWnd, IntPtr lParam);

    [DllImport("user32.dll")]
    public static extern bool EnumWindows(EnumWindowsProc lpEnumFunc, IntPtr lParam);

    [DllImport("user32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern int GetWindowTextW(IntPtr hWnd, StringBuilder lpString, int nMaxCount);

    [DllImport("user32.dll")]
    public static extern int GetWindowTextLengthW(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern uint GetWindowThreadProcessId(IntPtr hWnd, out uint lpdwProcessId);

    [DllImport("user32.dll")]
    public static extern bool IsWindowVisible(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern IntPtr GetForegroundWindow();

    [StructLayout(LayoutKind.Sequential)]
    public struct RECT {
        public int Left;
        public int Top;
        public int Right;
        public int Bottom;
    }

    [DllImport("user32.dll")]
    public static extern bool GetWindowRect(IntPtr hWnd, out RECT lpRect);

    public static List<Win32WindowDto> EnumerateWindows() {
        var windows = new List<Win32WindowDto>();
        IntPtr fgHwnd = GetForegroundWindow();

        EnumWindows((hWnd, lParam) => {
            // Filter: invisible windows
            if (!IsWindowVisible(hWnd)) {
                return true;
            }

            // Filter: empty title
            int textLength = GetWindowTextLengthW(hWnd);
            if (textLength <= 0) {
                return true;
            }

            var sb = new StringBuilder(textLength + 1);
            GetWindowTextW(hWnd, sb, sb.Capacity);
            string title = sb.ToString();
            if (string.IsNullOrWhiteSpace(title)) {
                return true;
            }

            // Filter: width <= 0 or height <= 0
            RECT rect;
            if (!GetWindowRect(hWnd, out rect)) {
                return true;
            }
            int width = rect.Right - rect.Left;
            int height = rect.Bottom - rect.Top;
            if (width <= 0 || height <= 0) {
                return true;
            }

            uint processId;
            GetWindowThreadProcessId(hWnd, out processId);

            string processName = "";
            try {
                var process = System.Diagnostics.Process.GetProcessById((int)processId);
                processName = process.ProcessName;
            } catch {}

            windows.Add(new Win32WindowDto {
                id = hWnd.ToString(),
                title = title,
                processId = (int)processId,
                processName = processName,
                x = rect.Left,
                y = rect.Top,
                width = width,
                height = height,
                isVisible = true,
                isForeground = (hWnd == fgHwnd)
            });

            return true;
        }, IntPtr.Zero);

        return windows;
    }

    public static Win32WindowDto GetForegroundWindowDto() {
        IntPtr hWnd = GetForegroundWindow();
        if (hWnd == IntPtr.Zero) return null;

        if (!IsWindowVisible(hWnd)) return null;

        int textLength = GetWindowTextLengthW(hWnd);
        if (textLength <= 0) return null;

        var sb = new StringBuilder(textLength + 1);
        GetWindowTextW(hWnd, sb, sb.Capacity);
        string title = sb.ToString();
        if (string.IsNullOrWhiteSpace(title)) return null;

        RECT rect;
        if (!GetWindowRect(hWnd, out rect)) return null;
        int width = rect.Right - rect.Left;
        int height = rect.Bottom - rect.Top;
        if (width <= 0 || height <= 0) return null;

        uint processId;
        GetWindowThreadProcessId(hWnd, out processId);

        string processName = "";
        try {
            var process = System.Diagnostics.Process.GetProcessById((int)processId);
            processName = process.ProcessName;
        } catch {}

        return new Win32WindowDto {
            id = hWnd.ToString(),
            title = title,
            processId = (int)processId,
            processName = processName,
            x = rect.Left,
            y = rect.Top,
            width = width,
            height = height,
            isVisible = true,
            isForeground = true
        };
    }
}
`;

interface RawWin32Window {
  id: string;
  title: string;
  processId: number;
  processName: string;
  x: number;
  y: number;
  width: number;
  height: number;
  isVisible: boolean;
  isForeground: boolean;
}

export class Win32Provider implements NativeProvider {
  /**
   * Helper to execute PowerShell scripts on Windows to call native Win32 APIs.
   */
  protected async executePowerShell(script: string): Promise<string> {
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

  /**
   * Enumerates all visible top-level windows using Win32 EnumWindows API.
   * Filters out:
   * - Invisible windows
   * - Empty-titled windows
   * - Windows with width <= 0 or height <= 0
   */
  async getWindows(): Promise<WindowInfo[]> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
$windows = [Win32NativeApi]::EnumerateWindows()
if ($windows.Count -eq 0) {
    "[]"
} else {
    $windows | ConvertTo-Json -Compress
}
`;

    try {
      const output = await this.executePowerShell(psScript);
      if (!output || output === 'null' || output === '[]') {
        return [];
      }

      const parsed = JSON.parse(output);
      const rawList: RawWin32Window[] = Array.isArray(parsed) ? parsed : [parsed];

      return rawList
        .filter(
          (item) =>
            item.title &&
            item.title.trim().length > 0 &&
            item.isVisible &&
            item.width > 0 &&
            item.height > 0
        )
        .map((item) => ({
          id: item.id,
          title: item.title,
          processId: item.processId,
          processName: item.processName || '',
          bounds: {
            x: item.x,
            y: item.y,
            width: item.width,
            height: item.height,
          },
          isVisible: item.isVisible,
          isMinimized: false,
          isForeground: item.isForeground,
          displayId: 'display-1',
        }));
    } catch {
      return [];
    }
  }

  /**
   * Retrieves the current foreground active window using GetForegroundWindow API.
   */
  async getActiveWindow(): Promise<WindowInfo | null> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
$fg = [Win32NativeApi]::GetForegroundWindowDto()
if ($null -eq $fg) {
    "null"
} else {
    $fg | ConvertTo-Json -Compress
}
`;

    try {
      const output = await this.executePowerShell(psScript);
      if (!output || output === 'null') {
        return null;
      }

      const item: RawWin32Window = JSON.parse(output);
      if (
        !item ||
        !item.title ||
        item.title.trim().length === 0 ||
        !item.isVisible ||
        item.width <= 0 ||
        item.height <= 0
      ) {
        return null;
      }

      return {
        id: item.id,
        title: item.title,
        processId: item.processId,
        processName: item.processName || '',
        bounds: {
          x: item.x,
          y: item.y,
          width: item.width,
          height: item.height,
        },
        isVisible: item.isVisible,
        isMinimized: false,
        isForeground: true,
        displayId: 'display-1',
      };
    } catch {
      return null;
    }
  }

  async getMousePosition(): Promise<MousePosition> {
    throw new Error('Not implemented');
  }

  async captureScreen(): Promise<ScreenCapture> {
    throw new Error('Not implemented');
  }

  async readClipboard(): Promise<string> {
    throw new Error('Not implemented');
  }

  async writeClipboard(_text: string): Promise<void> {
    throw new Error('Not implemented');
  }
}
