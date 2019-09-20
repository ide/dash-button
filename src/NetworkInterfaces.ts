import os from 'os';

export function getDefault(): string | null {
  let interfaces = os.networkInterfaces();
  let names = Object.keys(interfaces);
  for (let name of names) {
    if (interfaces[name].every(iface => !iface.internal)) {
      return name;
    }
  }
  return null;
}
