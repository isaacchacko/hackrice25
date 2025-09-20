
import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

export type ElectronAPI = {
  send: (channel: string, data: unknown) => void;
  on: (channel: string, callback: (data: unknown) => void) => void;
  invoke: <T = unknown, A = unknown>(channel: string, data: A) => Promise<T>;
};

const api: ElectronAPI = {
  send: (channel, data) => ipcRenderer.send(channel, data),
  on: (channel, callback) => ipcRenderer.on(channel, (_event: IpcRendererEvent, ...args: any[]) => callback(args[0])),
  invoke: (channel, data) => ipcRenderer.invoke(channel, data),
};

contextBridge.exposeInMainWorld('electronAPI', api);
