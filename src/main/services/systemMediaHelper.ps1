param(
    [Parameter(Mandatory=$true)]
    [string]$Action,
    [float]$Level = 0,
    [float]$Step = 5,
    [string]$Key = ""
)

Add-Type -TypeDefinition @"
using System;
using System.Runtime.InteropServices;

[Guid("5CDF2C82-841E-4546-9722-0CF74078229A"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IAudioEndpointVolume {
    void RegisterControlChangeNotify(IntPtr pNotify);
    void UnregisterControlChangeNotify(IntPtr pNotify);
    void GetChannelCount(out uint pnChannelCount);
    void SetMasterVolumeLevel(float fLevelDB, ref Guid pguidEventContext);
    void SetMasterVolumeLevelScalar(float fLevel, ref Guid pguidEventContext);
    void GetMasterVolumeLevel(out float pfLevelDB);
    void GetMasterVolumeLevelScalar(out float pfLevel);
    void SetChannelVolumeLevel(uint nChannel, float fLevelDB, ref Guid pguidEventContext);
    void SetChannelVolumeLevelScalar(uint nChannel, float fLevel, ref Guid pguidEventContext);
    void GetChannelVolumeLevel(uint nChannel, out float pfLevelDB);
    void GetChannelVolumeLevelScalar(uint nChannel, out float pfLevel);
    void SetMute([MarshalAs(UnmanagedType.Bool)] bool bMute, ref Guid pguidEventContext);
    void GetMute(out bool pbMute);
    void GetVolumeStepInfo(out uint pnStep, out uint pnStepCount);
    void VolumeStepUp(ref Guid pguidEventContext);
    void VolumeStepDown(ref Guid pguidEventContext);
    void QueryHardwareSupport(out uint pdwHardwareSupportMask);
    void GetVolumeRange(out float pflVolumeMindB, out float pflVolumeMaxdB, out float pflVolumeIncrementdB);
}

[Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDevice {
    void Activate(ref Guid id, int clsCtx, IntPtr activationParams, [MarshalAs(UnmanagedType.IUnknown)] out object aev);
    void OpenPropertyStore(int stgmAccess, out IntPtr ppProperties);
    void GetId([MarshalAs(UnmanagedType.LPWStr)] out string ppstrId);
    void GetState(out int pdwState);
}

[Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
public interface IMMDeviceEnumerator {
    void EnumAudioEndpoints(int dataFlow, int dwStateMask, out IntPtr ppDevices);
    void GetDefaultAudioEndpoint(int dataFlow, int role, out IMMDevice endpoint);
    void GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);
    void RegisterEndpointNotificationCallback(IntPtr pClient);
    void UnregisterEndpointNotificationCallback(IntPtr pClient);
}

[ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
public class MMDeviceEnumeratorComObject { }

public class AudioMaster {
    [DllImport("user32.dll")]
    public static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

    public static void SendKey(byte vk) {
        keybd_event(vk, 0, 0, UIntPtr.Zero);
        keybd_event(vk, 0, 2, UIntPtr.Zero);
    }

    public static IAudioEndpointVolume GetVolumeControl() {
        var enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumeratorComObject());
        IMMDevice dev;
        enumerator.GetDefaultAudioEndpoint(0, 1, out dev);
        var IID_IAudioEndpointVolume = typeof(IAudioEndpointVolume).GUID;
        object epv;
        dev.Activate(ref IID_IAudioEndpointVolume, 23, IntPtr.Zero, out epv);
        return (IAudioEndpointVolume)epv;
    }

    public static float GetVolume() {
        var vol = GetVolumeControl();
        float current = 0;
        vol.GetMasterVolumeLevelScalar(out current);
        return current * 100f;
    }

    public static void SetVolume(float level) {
        if (level < 0f) level = 0f;
        if (level > 100f) level = 100f;
        var vol = GetVolumeControl();
        var empty = Guid.Empty;
        vol.SetMasterVolumeLevelScalar(level / 100f, ref empty);
    }

    public static bool GetMute() {
        var vol = GetVolumeControl();
        bool mute;
        vol.GetMute(out mute);
        return mute;
    }

    public static void SetMute(bool mute) {
        var vol = GetVolumeControl();
        var empty = Guid.Empty;
        vol.SetMute(mute, ref empty);
    }
}
"@

try {
    switch ($Action.ToLower()) {
        "get" {
            $current = [AudioMaster]::GetVolume()
            $mute = [AudioMaster]::GetMute()
            [PSCustomObject]@{
                success = $true
                volume = [Math]::Round($current)
                muted = $mute
            } | ConvertTo-Json -Compress
        }
        "set" {
            [AudioMaster]::SetVolume($Level)
            $current = [AudioMaster]::GetVolume()
            $mute = [AudioMaster]::GetMute()
            [PSCustomObject]@{
                success = $true
                volume = [Math]::Round($current)
                muted = $mute
            } | ConvertTo-Json -Compress
        }
        "mute" {
            [AudioMaster]::SetMute($true)
            $current = [AudioMaster]::GetVolume()
            [PSCustomObject]@{
                success = $true
                volume = [Math]::Round($current)
                muted = $true
            } | ConvertTo-Json -Compress
        }
        "unmute" {
            [AudioMaster]::SetMute($false)
            $current = [AudioMaster]::GetVolume()
            [PSCustomObject]@{
                success = $true
                volume = [Math]::Round($current)
                muted = $false
            } | ConvertTo-Json -Compress
        }
        "step_up" {
            $current = [AudioMaster]::GetVolume()
            $newVol = [Math]::Min(100, $current + $Step)
            [AudioMaster]::SetVolume($newVol)
            [PSCustomObject]@{
                success = $true
                volume = [Math]::Round($newVol)
                muted = [AudioMaster]::GetMute()
            } | ConvertTo-Json -Compress
        }
        "step_down" {
            $current = [AudioMaster]::GetVolume()
            $newVol = [Math]::Max(0, $current - $Step)
            [AudioMaster]::SetVolume($newVol)
            [PSCustomObject]@{
                success = $true
                volume = [Math]::Round($newVol)
                muted = [AudioMaster]::GetMute()
            } | ConvertTo-Json -Compress
        }
        "media" {
            $vk = 0
            switch ($Key.ToLower()) {
                "play_pause" { $vk = 0xB3 }
                "next" { $vk = 0xB0 }
                "previous" { $vk = 0xB1 }
                "stop" { $vk = 0xB2 }
                default { throw "Unknown media key: $Key" }
            }
            [AudioMaster]::SendKey([byte]$vk)
            [PSCustomObject]@{
                success = $true
                key = $Key
            } | ConvertTo-Json -Compress
        }
        default {
            [PSCustomObject]@{
                success = $false
                error = "Unknown action: $Action"
            } | ConvertTo-Json -Compress
        }
    }
} catch {
    [PSCustomObject]@{
        success = $false
        error = $_.Exception.Message
    } | ConvertTo-Json -Compress
}
