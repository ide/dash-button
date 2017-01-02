// @flow
import os from 'os';

export default {
  getDefault(): ?string {
    let interfaces = os.networkInterfaces();
    let names = Object.keys(interfaces);
    for (let name of names) {
      if (interfaces[name].every(iface => !iface.internal)) {
        return name;
      }
    }
    return null;
  },
};
