using System;
using System.Runtime.InteropServices;
using System.Threading;

class PasteHelper {
    [DllImport("user32.dll")]
    static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    const byte VK_CONTROL = 0x11;
    const byte VK_V = 0x56;
    const uint KEYEVENTF_KEYUP = 0x0002;

    static void Main(string[] args) {
        // Brief pause to allow target window (Notepad, Word, Browser, etc.) to hold focus
        Thread.Sleep(50);
        keybd_event(VK_CONTROL, 0, 0, UIntPtr.Zero);
        keybd_event(VK_V, 0, 0, UIntPtr.Zero);
        Thread.Sleep(20);
        keybd_event(VK_V, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
        keybd_event(VK_CONTROL, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
    }
}
