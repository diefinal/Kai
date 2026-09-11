import { spawn } from 'child_process';
import { NativeProvider, MousePosition, ScreenCapture } from './NativeProvider';
import { WindowInfo } from '../window/Window';
import { Key } from '../input/Key';
import { InputProvider } from '../input/InputProvider';

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
 * - VkKeyScanW
 * - MapVirtualKeyW
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

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern short VkKeyScanW(char ch);

    [DllImport("user32.dll", CharSet = CharSet.Unicode)]
    public static extern uint MapVirtualKeyW(uint uCode, uint uMapType);

    // SendInput structures & constants
    public const int INPUT_MOUSE = 0;
    public const int INPUT_KEYBOARD = 1;

    public const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
    public const uint MOUSEEVENTF_LEFTUP = 0x0004;
    public const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
    public const uint MOUSEEVENTF_RIGHTUP = 0x0010;

    public const uint KEYEVENTF_EXTENDEDKEY = 0x0001;
    public const uint KEYEVENTF_KEYUP = 0x0002;
    public const uint KEYEVENTF_UNICODE = 0x0004;
    public const uint KEYEVENTF_SCANCODE = 0x0008;

    [StructLayout(LayoutKind.Sequential)]
    public struct MOUSEINPUT {
        public int dx;
        public int dy;
        public uint mouseData;
        public uint dwFlags;
        public uint time;
        public IntPtr dwExtraInfo;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct KEYBDINPUT {
        public ushort wVk;
        public ushort wScan;
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
        [FieldOffset(8)]
        public KEYBDINPUT ki;
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

    public static void SendKey(ushort vk, bool isUp, bool isExtended = false) {
        uint flags = 0;
        if (isUp) flags |= KEYEVENTF_KEYUP;
        if (isExtended) flags |= KEYEVENTF_EXTENDEDKEY;

        ushort scan = (ushort)MapVirtualKeyW(vk, 0);

        INPUT[] inputs = new INPUT[1];
        inputs[0] = new INPUT {
            type = INPUT_KEYBOARD,
            ki = new KEYBDINPUT {
                wVk = vk,
                wScan = scan,
                dwFlags = flags,
                time = 0,
                dwExtraInfo = IntPtr.Zero
            }
        };
        SendInput(1, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    public static void TapKey(ushort vk, bool isExtended = false) {
        SendKey(vk, false, isExtended);
        SendKey(vk, true, isExtended);
    }

    public static void SendUnicodeChar(char ch) {
        INPUT[] inputs = new INPUT[2];
        inputs[0] = new INPUT {
            type = INPUT_KEYBOARD,
            ki = new KEYBDINPUT {
                wVk = 0,
                wScan = (ushort)ch,
                dwFlags = KEYEVENTF_UNICODE,
                time = 0,
                dwExtraInfo = IntPtr.Zero
            }
        };
        inputs[1] = new INPUT {
            type = INPUT_KEYBOARD,
            ki = new KEYBDINPUT {
                wVk = 0,
                wScan = (ushort)ch,
                dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                time = 0,
                dwExtraInfo = IntPtr.Zero
            }
        };
        SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
    }

    [DllImport("user32.dll")]
    public static extern bool SetForegroundWindow(IntPtr hWnd);

    [DllImport("user32.dll")]
    public static extern bool ShowWindowAsync(IntPtr hWnd, int nCmdShow);

    [DllImport("user32.dll")]
    public static extern bool PostMessage(IntPtr hWnd, uint Msg, IntPtr wParam, IntPtr lParam);

    public const int SW_SHOWNORMAL = 1;
    public const int SW_SHOWMINIMIZED = 2;
    public const int SW_MAXIMIZE = 3;
    public const int SW_RESTORE = 9;
    public const uint WM_CLOSE = 0x0010;

    public static bool ActivateWindow(IntPtr hWnd) {
        ShowWindowAsync(hWnd, SW_RESTORE);
        return SetForegroundWindow(hWnd);
    }

    public static bool MinimizeWindow(IntPtr hWnd) {
        return ShowWindowAsync(hWnd, SW_SHOWMINIMIZED);
    }

    public static bool MaximizeWindow(IntPtr hWnd) {
        return ShowWindowAsync(hWnd, SW_MAXIMIZE);
    }

    public static bool CloseWindow(IntPtr hWnd) {
        return PostMessage(hWnd, WM_CLOSE, IntPtr.Zero, IntPtr.Zero);
    }

    public static void TypeText(string text) {
        if (string.IsNullOrEmpty(text)) return;
        foreach (char c in text) {
            SendUnicodeChar(c);
        }
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

/**
 * Maps Key enum to Virtual Key code and whether it is an extended key.
 */
function getVirtualKeyCode(key: Key): { vk: number; extended: boolean } {
  switch (key) {
    case Key.Enter:
      return { vk: 0x0D, extended: false };
    case Key.Escape:
      return { vk: 0x1B, extended: false };
    case Key.Tab:
      return { vk: 0x09, extended: false };
    case Key.Space:
      return { vk: 0x20, extended: false };
    case Key.Backspace:
      return { vk: 0x08, extended: false };
    case Key.Delete:
      return { vk: 0x2E, extended: true };
    case Key.ArrowUp:
      return { vk: 0x26, extended: true };
    case Key.ArrowDown:
      return { vk: 0x28, extended: true };
    case Key.ArrowLeft:
      return { vk: 0x25, extended: true };
    case Key.ArrowRight:
      return { vk: 0x27, extended: true };
    case Key.Control:
      return { vk: 0x11, extended: false };
    case Key.Shift:
      return { vk: 0x10, extended: false };
    case Key.Alt:
      return { vk: 0x12, extended: false };
    case Key.Meta:
    case Key.Win:
      return { vk: 0x5B, extended: true };

    // Digits 0-9
    case Key.Digit0:
      return { vk: 0x30, extended: false };
    case Key.Digit1:
      return { vk: 0x31, extended: false };
    case Key.Digit2:
      return { vk: 0x32, extended: false };
    case Key.Digit3:
      return { vk: 0x33, extended: false };
    case Key.Digit4:
      return { vk: 0x34, extended: false };
    case Key.Digit5:
      return { vk: 0x35, extended: false };
    case Key.Digit6:
      return { vk: 0x36, extended: false };
    case Key.Digit7:
      return { vk: 0x37, extended: false };
    case Key.Digit8:
      return { vk: 0x38, extended: false };
    case Key.Digit9:
      return { vk: 0x39, extended: false };

    // Letters A-Z
    default:
      if (typeof key === 'string' && key.length === 1 && key >= 'A' && key <= 'Z') {
        return { vk: key.charCodeAt(0), extended: false };
      }
      return { vk: 0, extended: false };
  }
}

export class Win32Provider implements NativeProvider, InputProvider {
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

  /**
   * Simulates pressing down a keyboard key using Win32 SendInput API.
   */
  async pressKey(key: Key): Promise<void> {
    const { vk, extended } = getVirtualKeyCode(key);
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::SendKey(${vk}, $false, ${extended ? '$true' : '$false'})
`;
    await this.executePowerShell(psScript);
  }

  /**
   * Simulates releasing a keyboard key using Win32 SendInput API.
   */
  async releaseKey(key: Key): Promise<void> {
    const { vk, extended } = getVirtualKeyCode(key);
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::SendKey(${vk}, $true, ${extended ? '$true' : '$false'})
`;
    await this.executePowerShell(psScript);
  }

  /**
   * Simulates pressing and immediately releasing a keyboard key.
   */
  async tapKey(key: Key): Promise<void> {
    const { vk, extended } = getVirtualKeyCode(key);
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::TapKey(${vk}, ${extended ? '$true' : '$false'})
`;
    await this.executePowerShell(psScript);
  }

  /**
   * Simulates typing a string of text using Win32 Unicode SendInput.
   */
  async typeText(text: string): Promise<void> {
    const encoded = JSON.stringify(text);
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
$text = ${encoded}
[Win32NativeApi]::TypeText($text)
`;
    await this.executePowerShell(psScript);
  }

  /**
   * Activates / brings window with the specified handle ID to the foreground.
   */
  async activateWindow(id: string): Promise<boolean> {
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
[Win32NativeApi]::ActivateWindow([IntPtr]${id})
`;
    try {
      const output = await this.executePowerShell(psScript);
      return output.toLowerCase().includes('true');
    } catch {
      return false;
    }
  }

  /**
   * Minimizes the window with the given handle ID or foreground window if omitted.
   */
  async minimizeWindow(id?: string): Promise<boolean> {
    const targetId = id ? `[IntPtr]${id}` : '[Win32NativeApi]::GetForegroundWindow()';
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
$target = ${targetId}
if ($target -ne [IntPtr]::Zero) {
    [Win32NativeApi]::MinimizeWindow($target)
} else {
    $false
}
`;
    try {
      const output = await this.executePowerShell(psScript);
      return output.toLowerCase().includes('true');
    } catch {
      return false;
    }
  }

  /**
   * Maximizes the window with the given handle ID or foreground window if omitted.
   */
  async maximizeWindow(id?: string): Promise<boolean> {
    const targetId = id ? `[IntPtr]${id}` : '[Win32NativeApi]::GetForegroundWindow()';
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
$target = ${targetId}
if ($target -ne [IntPtr]::Zero) {
    [Win32NativeApi]::MaximizeWindow($target)
} else {
    $false
}
`;
    try {
      const output = await this.executePowerShell(psScript);
      return output.toLowerCase().includes('true');
    } catch {
      return false;
    }
  }

  /**
   * Closes the window with the given handle ID or foreground window if omitted.
   */
  async closeWindow(id?: string): Promise<boolean> {
    const targetId = id ? `[IntPtr]${id}` : '[Win32NativeApi]::GetForegroundWindow()';
    const psScript = `
Add-Type -TypeDefinition @"
${WIN32_HELPER_CS}
"@
$target = ${targetId}
if ($target -ne [IntPtr]::Zero) {
    [Win32NativeApi]::CloseWindow($target)
} else {
    $false
}
`;
    try {
      const output = await this.executePowerShell(psScript);
      return output.toLowerCase().includes('true');
    } catch {
      return false;
    }
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
