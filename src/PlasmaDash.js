import assert from 'assert';
import pcap from 'pcap';

import NetworkInterfaces from './NetworkInterfaces';

type Options = {
  networkInterface?: string,
};

let pcapSession;

function getPcapSession(interfaceName: string) {
  if (!pcapSession) {
    pcapSession = pcap.createSession(interfaceName);
  } else {
    assert.equal(
      interfaceName, pcapSession.device_name,
      'The existing pcap session must be listening on the specified interface',
    );
  }
  return pcapSession;
}

export default class PlasmaDash {
  constructor(macAddress: string, options?: Options = {}) {
    this._macAddress = macAddress;
    this._networkInterface = options.networkInterface ||
      NetworkInterfaces.getDefault();
    this._packetListener = this._handlePacket.bind(this);
    this._dashListeners = new Set();
    this._isResponding = false;
  }

  addListener(listener): Subscription {
    if (!this._dashListeners.size) {
      let session = getPcapSession();
      session.addListener('packet', this._packetListener);
    }

    // We run the listeners with Promise.all, which rejects early as soon as
    // any of its promises are rejected. Since we want to wait for all of the
    // listeners to finish we need to catch any errors they may throw.
    let guardedListener = this._createGuardedListener(listener);
    this._dashListeners.add(guardedListener);

    return new Subscription(() => {
      this._dashListeners.remove(guardedListener);
      if (!this._dashListeners.size) {
        let session = getPcapSession();
        session.removeListener('packet', this._packetListener);
        if (!session.listenerCount('packet')) {
          session.close();
        }
      }
    });
  }

  _createGuardedListener(listener) {
    return async function(...args) {
      try {
        return await listener(...args);
      } catch (error) {
        return error;
      }
    };
  }

  async _handlePacket(rawPacket) {
    if (this._isResponding) {
      return;
    }

    let packet = pcap.decode(rawPacket);

    this._isResponding = true;
    try {
      // The listeners are guarded so this should never throw, but wrap it in
      // try-catch to be defensive
      await Promise.all(Array.from(this._dashListeners).map(
        listener => listener(packet)
      ));
    } finally {
      this._isResponding = false;
    }
  }
}

class Subscription {
  constructor(onRemove) {
    this._remove = onRemove;
  }

  remove() {
    if (this._remove) {
      return;
    }
    this._remove();
    delete this._remove;
  }
}
