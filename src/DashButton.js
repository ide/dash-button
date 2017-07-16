// @flow
import assert from 'assert';
import nullthrows from 'nullthrows';
import pcap from 'pcap';

import MacAddresses from './MacAddresses';
import NetworkInterfaces from './NetworkInterfaces';
import Packets from './Packets';

export type DashButtonOptions = {
  networkInterface?: string,
};

export type DashButtonListener = (packet: Object) => void | Promise<void>;

type GuardedListener = (packet: Object) => Promise<?Error>;

let pcapSession;

function getPcapSession(interfaceName: string) {
  if (!pcapSession) {
    pcapSession = Packets.createCaptureSession(interfaceName);
  } else {
    assert.equal(
      interfaceName, pcapSession.device_name,
      'The existing pcap session must be listening on the specified interface',
    );
  }
  return pcapSession;
}

export default class DashButton {
  _macAddress: string;
  _networkInterface: string;
  _packetListener: Function;
  _dashListeners: Set<GuardedListener>;
  _isResponding: boolean;

  constructor(macAddress: string, options: DashButtonOptions = {}) {
    this._macAddress = macAddress.toLowerCase();
    this._networkInterface = options.networkInterface ||
      nullthrows(NetworkInterfaces.getDefault());
    this._packetListener = this._handlePacket.bind(this);
    this._dashListeners = new Set();
    this._isResponding = false;
  }

  addListener(listener: DashButtonListener): Subscription {
    if (!this._dashListeners.size) {
      let session = getPcapSession(this._networkInterface);
      session.addListener('packet', this._packetListener);
    }

    // We run the listeners with Promise.all, which rejects early as soon as
    // any of its promises are rejected. Since we want to wait for all of the
    // listeners to finish we need to catch any errors they may throw.
    let guardedListener = this._createGuardedListener(listener);
    this._dashListeners.add(guardedListener);

    return new Subscription(() => {
      this._dashListeners.delete(guardedListener);
      if (!this._dashListeners.size) {
        let session = getPcapSession(this._networkInterface);
        session.removeListener('packet', this._packetListener);
        if (!session.listenerCount('packet')) {
          session.close();
        }
      }
    });
  }

  _createGuardedListener(
    listener: (...args: *[]) => void | Promise<void>,
  ): GuardedListener {
    return async (...args: *[]): Promise<?Error> => {
      try {
        await listener(...args);
      } catch (error) {
        return error;
      }
    };
  }

  async _handlePacket(rawPacket: Object): Promise<void> {
    if (this._isResponding) {
      return;
    }

    let packet = pcap.decode(rawPacket);
    let macAddress = MacAddresses.getEthernetSource(packet);
    if (macAddress !== this._macAddress) {
      return;
    }

    this._isResponding = true;
    try {
      // The listeners are guarded so this should never throw, but wrap it in
      // try-catch to be defensive
      let listeners = Array.from(this._dashListeners);
      let errors = await Promise.all(
        listeners.map(listener => listener(packet)),
      );
      for (let error of errors) {
        if (error) {
          console.error(`Listener threw an uncaught error:\n${error.stack}`);
        }
      }
    } finally {
      this._isResponding = false;
    }
  }
}

class Subscription {
  _remove: () => void;

  constructor(onRemove: () => void) {
    this._remove = onRemove;
  }

  remove(): void {
    if (!this._remove) {
      return;
    }
    this._remove();
    delete this._remove;
  }
}
