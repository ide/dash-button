import assert from 'assert';

jest.mock('pcap');
jest.mock('../NetworkInterfaces');

describe('DashButton', () => {
  const MAC_ADDRESS = '00:11:22:33:44:55';
  const NETWORK_INTERFACE = 'en0';

  let pcap;
  let DashButton;
  let NetworkInterfaces;

  beforeEach(() => {
    pcap = require('pcap');
    DashButton = require('../DashButton');
    NetworkInterfaces = require('../NetworkInterfaces');

    NetworkInterfaces.getDefault.mockReturnValue(NETWORK_INTERFACE);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it(`should normalize (lowercase) the dash buttons Mac Address`, () => {
    let button = new DashButton('00:11:AA:33:44:BB');

    expect(button._macAddress).toEqual('00:11:aa:33:44:bb');
  });

  it(`creates a pcap session the first time a listener is added`, () => {
    let button = new DashButton(MAC_ADDRESS);
    button.addListener(() => {});

    expect(pcap.createSession).toHaveBeenCalledTimes(1);
  });

  it(`shares pcap sessions amongst buttons`, () => {
    let button1 = new DashButton(MAC_ADDRESS);
    button1.addListener(() => {});

    let button2 = new DashButton('66:77:88:99:aa:bb');
    button2.addListener(() => {});

    expect(pcap.createSession).toHaveBeenCalledTimes(1);
  });

  it(`creates a pcap session on the default interface`, () => {
    let button = new DashButton(MAC_ADDRESS);
    button.addListener(() => {});

    expect(pcap.createSession).toHaveBeenCalledTimes(1);
    expect(pcap.createSession.mock.calls[0][0]).toBe(NETWORK_INTERFACE);
  });

  it(`creates a pcap session on the specified interface`, () => {
    let button = new DashButton(MAC_ADDRESS, { networkInterface: 'wlan0' });
    button.addListener(() => {});

    expect(pcap.createSession).toHaveBeenCalledTimes(1);
    expect(pcap.createSession.mock.calls[0][0]).toBe('wlan0');
  });

  it(`notifies the appropriate listeners for each packet`, () => {
    let mockSession = pcap.createSession(NetworkInterfaces.getDefault());
    pcap.createSession.mockReturnValueOnce(mockSession);

    let button1Listener = jest.genMockFunction();
    let button2Listener = jest.genMockFunction();

    let button1 = new DashButton(MAC_ADDRESS);
    button1.addListener(button1Listener);
    let button2 = new DashButton('66:77:88:99:aa:bb');
    button2.addListener(button2Listener);

    let packet1 = createMockArpProbe(MAC_ADDRESS);
    mockSession.emit('packet', packet1);
    expect(button1Listener).toHaveBeenCalledTimes(1);
    expect(button2Listener).not.toHaveBeenCalled();

    let packet2 = createMockArpProbe('66:77:88:99:aa:bb');
    mockSession.emit('packet', packet2);
    expect(button1Listener).toHaveBeenCalledTimes(1);
    expect(button2Listener).toHaveBeenCalledTimes(1);
  });

  it(`waits for listeners for a prior packet to asynchronously complete ` +
     `before handling any new packets`, async () => {
    let mockSession = pcap.createSession(NetworkInterfaces.getDefault());
    let listenerCompletion = null;
    let originalAddListener = mockSession.addListener;
    mockSession.addListener = function addListener(eventName, listener) {
      originalAddListener.call(this, eventName, function(...args) {
        listenerCompletion = listener.apply(this, args);
      });
    };
    pcap.createSession.mockReturnValueOnce(mockSession);

    let button = new DashButton(MAC_ADDRESS);
    let calls = 0;
    button.addListener(() => { calls++; });

    let packet = createMockArpProbe(MAC_ADDRESS);
    mockSession.emit('packet', packet);
    expect(calls).toBe(1);
    let firstListenerCompletion = listenerCompletion;
    mockSession.emit('packet', packet);
    expect(calls).toBe(1);
    await firstListenerCompletion;
    mockSession.emit('packet', packet);
    expect(calls).toBe(2);
  });

  it(`waits for all listeners even if some threw an error`, async () => {
    let mockSession = pcap.createSession(NetworkInterfaces.getDefault());
    pcap.createSession.mockReturnValueOnce(mockSession);

    let originalConsole = global.console;
    global.console = require.requireMock('console');

    let button = new DashButton(MAC_ADDRESS);
    let errorCount = 0;
    button.addListener(() => {
      errorCount++;
      throw new Error('Intentional sync error');
    });
    button.addListener(() => {
      errorCount++;
      return Promise.reject(new Error('Intentional async error'));
    });

    let listenerPromise;
    button.addListener(() => {
      listenerPromise = (async () => {
        // Wait for the other listeners to throw
        await Promise.resolve();
        expect(errorCount).toBe(2);
        await Promise.resolve();
        return 'success';
      })();
      return listenerPromise;
    });

    let packet = createMockArpProbe(MAC_ADDRESS);
    expect(listenerPromise).not.toBeDefined();
    expect(console.error).not.toHaveBeenCalled();

    mockSession.emit('packet', packet);
    expect(listenerPromise).toBeDefined();
    let result = await listenerPromise;
    expect(result).toBe('success');

    // TODO: Define a public interface to learn when the DashButton is done
    // handling a packet
    while (button._isResponding) {
      await Promise.resolve();
    }

    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error.mock.calls[0][0]).toEqual(
      expect.stringContaining('Intentional sync error'),
    );
    expect(console.error.mock.calls[1][0]).toEqual(
      expect.stringContaining('Intentional async error'),
    );

    global.console = originalConsole;
  });

  it(`runs its async listeners concurrently`, () => {
    let mockSession = pcap.createSession(NetworkInterfaces.getDefault());
    pcap.createSession.mockReturnValueOnce(mockSession);

    let button = new DashButton(MAC_ADDRESS);
    let calls = 0;
    button.addListener(async () => {
      calls++;
      await Promise.resolve();
    });
    button.addListener(async () => {
      calls++;
      await Promise.resolve();
    });

    let packet = createMockArpProbe(MAC_ADDRESS);
    expect(calls).toBe(0);
    mockSession.emit('packet', packet);
    expect(calls).toBe(2);
  });

  it(`removes packet listeners when a button has no more listeners`, () => {
    let mockSession = pcap.createSession(NetworkInterfaces.getDefault());
    pcap.createSession.mockReturnValueOnce(mockSession);

    let button = new DashButton(MAC_ADDRESS);
    let subscription1 = button.addListener(() => {});
    let subscription2 = button.addListener(() => {});
    expect(mockSession.listenerCount('packet')).toBe(1);

    subscription1.remove();
    expect(mockSession.listenerCount('packet')).toBe(1);
    subscription2.remove();
    expect(mockSession.listenerCount('packet')).toBe(0);
  });

  it(`doesn't throw if you remove a subscription twice`, () => {
    let mockSession = pcap.createSession(NetworkInterfaces.getDefault());
    pcap.createSession.mockReturnValueOnce(mockSession);

    let button = new DashButton(MAC_ADDRESS);
    let subscription = button.addListener(() => {});

    subscription.remove();
    expect(mockSession.listenerCount('packet')).toBe(0);
    expect(() => subscription.remove()).not.toThrow();
  });

  it(`closes the pcap session when no more buttons are listening`, () => {
    let mockSession = pcap.createSession(NetworkInterfaces.getDefault());
    pcap.createSession.mockReturnValueOnce(mockSession);

    let button1Listener = jest.genMockFunction();
    let button2Listener = jest.genMockFunction();

    let button1 = new DashButton(MAC_ADDRESS);
    let subscription1 = button1.addListener(button1Listener);
    let button2 = new DashButton('66:77:88:99:aa:bb');
    let subscription2 = button2.addListener(button2Listener);

    subscription1.remove();
    expect(mockSession.close).not.toHaveBeenCalled();
    subscription2.remove();
    expect(mockSession.close).toHaveBeenCalledTimes(1);
  });
});

function createMockArpProbe(sourceMacAddress) {
  let decimals = sourceMacAddress.split(':').map(hex => parseInt(hex, 16));
  assert(decimals.length === 6, 'MAC addresses must be six bytes');

  return {
    link_type: 'LINKTYPE_ETHERNET',
    header: new Buffer([
      249, 133,  27,  86,  // Seconds
      137, 239,   1,   0,  // Microseconds
       42,   0,   0,   0,  // Captured length
       42,   0,   0,   0,  // Total length
    ]),
    buf: new Buffer([
      255, 255, 255, 255, 255, 255,  // Destination MAC address
      ...decimals,                   // Source MAC address
        8,   6,  // EtherType (0x0806 = ARP)
        0,   1,  // HTYPE
        8,   0,  // PTYPE
        6,       // HLEN
        4,       // PLEN
        0,   1,  // Operation
      ...decimals,                   // SHA
        0,   0,   0,   0,            // SPA
        0,   0,   0,   0,   0,   0,  // THA
       10,   0,  10,  20,            // TPA
    ]),
  };
}
