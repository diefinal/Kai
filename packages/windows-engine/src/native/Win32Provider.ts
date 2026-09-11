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
 * - GetCursorPos
 * - SetCursorPos
 * - SendInput
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

public class Win32PointDto {
    public int x { get; set; }
    public int y { get; set; }
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

    [StructLayout(LayoutKind.Sequential)]
    public struct POINT {
        public int X;
        public int Y;
    }

    [DllImport("user32.dll")]
    public static extern bool GetCursorPos(out POINT lpPoint);

    [DllImport("user32.dll")]
    public static extern bool SetCursorPos(int X, int Y);

    // SendInput structures & constants
    public const int INPUT_MOUSE = 0;
    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Explicit)]
    public struct INPUT {
        [FieldOffset(0)]
        public int type;
        [FieldOffset(8)]
        public MOUSEINPUT mi;
    }

    [DllImport("user32.dll", SetLastError = true)]
    public static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

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

    public static Win32PointDto GetCursorPosition() {
        POINT pt;
        GetCursorPos(out pt);
        return new Win32PointDto { x = pt.X, y = pt.Y };
    }

    public static void MoveCursor(int x, int y) {
        SetCursorPos(x, y);
    }

    public static void SendMouseClick(uint downFlag, uint upFlag) {
        INPUT[] inputs = new INPUT[2];
        inputs[0] = new INPUT {
            type = INPUT_MOUSE,
            mi = new MOUSEINPUT { dwFlags = downFlag }
        };
        inputs[1] = new INPUT {
            type = INPUT_MOUSE,
            mi = new MOUSEINPUT { dwFlags = upFlag }
        };
        SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void SendLeftClick() {
        SendMouseClick(MOUSEEVENTF_LEFTDOWN, MOUSEEVENTF_LEFTUP);
    }

    public static void SendRightClick() {
        SendMouseClick(MOUSEEVENTF_RIGHTDOWN, MOUSEEVENTF_RIGHTUP);
    }

    public static void SendDoubleClick() {
        SendLeftClick();
        System.Threading.Thread.Sleep(50);
        SendLeftClick();
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

interface RawWin32Point {
  x: number;
  y: number;
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

  /**
   * Retrieves the current cursor position using Win32 GetCursorPos API.
   */
  async getMousePosition(): Promise<MousePosition> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
$pos = [Win32NativeApi]::GetCursorPosition()
$pos | ConvertTo-Json -Compress
`;

    try {
      const output = await this.executePowerShell(psScript);
      if (!output || output === 'null') {
        return { x: 0, y: 0 };
      }
      const pt: RawWin32Point = JSON.parse(output);
      return { x: pt.x, y: pt.y };
    } catch {
      return { x: 0, y: 0 };
    }
  }

  /**
   * Moves mouse cursor to specified coordinates using Win32 SetCursorPos API.
   */
  async moveMouse(x: number, y: number): Promise<void> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::MoveCursor(${Math.round(x)}, ${Math.round(y)})
`;
    await this.executePowerShell(psScript);
  }

  /**
   * Simulates a left mouse button click using Win32 SendInput API.
   */
  async leftClick(): Promise<void> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::SendLeftClick()
`;
    await this.executePowerShell(psScript);
  }

  /**
   * Simulates a right mouse button click using Win32 SendInput API.
   */
  async rightClick(): Promise<void> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::SendRightClick()
`;
    await this.executePowerShell(psScript);
  }

  /**
   * Simulates a double left click using Win32 SendInput API.
   */
  async doubleClick(): Promise<void> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::SendDoubleClick()
`;
    await this.executePowerShell(psScript);
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
