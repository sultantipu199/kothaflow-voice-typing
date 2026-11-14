using System;
using System.Diagnostics;
using System.Runtime.InteropServices;
using System.Windows.Forms;

class AltHook {
    private const int WH_KEYBOARD_LL = 13;
    private const int WM_KEYDOWN = 0x0100;
    private const int WM_KEYUP = 0x0101;
    private const int WM_SYSKEYDOWN = 0x0104;
    private const int WM_SYSKEYUP = 0x0105;
    private const int VK_LMENU = 0xA4; // Left Alt

    private static LowLevelKeyboardProc _proc = HookCallback;
    private static IntPtr _hookID = IntPtr.Zero;

    private static bool _altDown = false;
    private static bool _otherKeyPressed = false;
    private static DateTime _altPressTime = DateTime.MinValue;

    public static void Main() {
        _hookID = SetHook(_proc);
        Console.WriteLine("HOOK_READY");
        Console.Out.Flush();
        Application.Run();
        UnhookWindowsHookEx(_hookID);
    }

    private static IntPtr SetHook(LowLevelKeyboardProc proc) {
        using (Process curProcess = Process.GetCurrentProcess())
        using (ProcessModule curModule = curProcess.MainModule) {
            return SetWindowsHookEx(WH_KEYBOARD_LL, proc, GetModuleHandle(curModule.ModuleName), 0);
        }
    }

    private delegate IntPtr LowLevelKeyboardProc(int nCode, IntPtr wParam, IntPtr lParam);

    private static IntPtr HookCallback(int nCode, IntPtr wParam, IntPtr lParam) {
        if (nCode >= 0) {
            int vkCode = Marshal.ReadInt32(lParam);
            int msg = (int)wParam;

            if (vkCode == VK_LMENU) {
                if (msg == WM_KEYDOWN || msg == WM_SYSKEYDOWN) {
                    if (!_altDown) {
                        _altDown = true;
                        _otherKeyPressed = false;
                        _altPressTime = DateTime.UtcNow;
                        Console.WriteLine("ALT_DOWN");
                        Console.Out.Flush();
                    }
                } else if (msg == WM_KEYUP || msg == WM_SYSKEYUP) {
                    if (_altDown) {
                        _altDown = false;
                        double durationMs = (DateTime.UtcNow - _altPressTime).TotalMilliseconds;
                        if (!_otherKeyPressed) {
                            if (durationMs > 250) {
                                Console.WriteLine("ALT_HOLD_RELEASE");
                            } else {
                                Console.WriteLine("ALT_TAP");
                            }
                            Console.Out.Flush();
                        } else {
                            Console.WriteLine("ALT_CANCEL");
                            Console.Out.Flush();
                        }
                    }
                }
            } else {
                if (_altDown) {
                    _otherKeyPressed = true;
                }
            }
        }
        return CallNextHookEx(_hookID, nCode, wParam, lParam);
    }

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr SetWindowsHookEx(int idHook, LowLevelKeyboardProc lpfn, IntPtr hMod, uint dwThreadId);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool UnhookWindowsHookEx(IntPtr hhk);

    [DllImport("user32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr CallNextHookEx(IntPtr hhk, int nCode, IntPtr wParam, IntPtr lParam);

    [DllImport("kernel32.dll", CharSet = CharSet.Auto, SetLastError = true)]
    private static extern IntPtr GetModuleHandle(string lpModuleName);
}
