// Dynamic Audio Device Detection & Management for VISION OS

export interface AudioDeviceInfo {
  deviceId: string;
  label: string;
  kind: 'audioinput' | 'audiooutput';
  isDefault: boolean;
}

const STORAGE_KEY_MIC = 'vision_selected_mic_id';
const STORAGE_KEY_SPEAKER = 'vision_selected_speaker_id';

class AudioDeviceManager {
  private inputDevices: AudioDeviceInfo[] = [];
  private outputDevices: AudioDeviceInfo[] = [];
  private selectedMicId: string = localStorage.getItem(STORAGE_KEY_MIC) || 'default';
  private selectedSpeakerId: string = localStorage.getItem(STORAGE_KEY_SPEAKER) || 'default';
  private listeners: Array<() => void> = [];

  constructor() {
    if (typeof navigator !== 'undefined' && navigator.mediaDevices) {
      this.refreshDevices();
      navigator.mediaDevices.ondevicechange = () => {
        this.refreshDevices();
      };
    }
  }

  public async refreshDevices(): Promise<{ inputs: AudioDeviceInfo[]; outputs: AudioDeviceInfo[] }> {
    try {
      // Prompt permissions once if labels are empty
      const devices = await navigator.mediaDevices.enumerateDevices();
      
      const inputs: AudioDeviceInfo[] = [];
      const outputs: AudioDeviceInfo[] = [];

      devices.forEach((dev) => {
        if (dev.kind === 'audioinput') {
          inputs.push({
            deviceId: dev.deviceId,
            label: dev.label || `Microphone (${inputs.length + 1})`,
            kind: 'audioinput',
            isDefault: dev.deviceId === 'default' || dev.label.toLowerCase().includes('default'),
          });
        } else if (dev.kind === 'audiooutput') {
          outputs.push({
            deviceId: dev.deviceId,
            label: dev.label || `Speaker (${outputs.length + 1})`,
            kind: 'audiooutput',
            isDefault: dev.deviceId === 'default' || dev.label.toLowerCase().includes('default'),
          });
        }
      });

      this.inputDevices = inputs;
      this.outputDevices = outputs;
      this.notifyListeners();

      return { inputs, outputs };
    } catch (err) {
      console.warn('Unable to enumerate audio devices:', err);
      return { inputs: [], outputs: [] };
    }
  }

  public getInputDevices(): AudioDeviceInfo[] {
    return this.inputDevices;
  }

  public getOutputDevices(): AudioDeviceInfo[] {
    return this.outputDevices;
  }

  public getSelectedMicId(): string {
    return this.selectedMicId;
  }

  public setSelectedMicId(deviceId: string) {
    this.selectedMicId = deviceId;
    localStorage.setItem(STORAGE_KEY_MIC, deviceId);
    this.notifyListeners();
  }

  public getSelectedSpeakerId(): string {
    return this.selectedSpeakerId;
  }

  public setSelectedSpeakerId(deviceId: string) {
    this.selectedSpeakerId = deviceId;
    localStorage.setItem(STORAGE_KEY_SPEAKER, deviceId);
    this.notifyListeners();
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => cb());
  }
}

export const audioDeviceManager = new AudioDeviceManager();
