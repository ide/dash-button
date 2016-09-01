import assert from 'assert';
import events from 'events';

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

    pcap.createSession.mockImplementation(() => createMockPcapSession());
    NetworkInterfaces.getDefault.mockReturnValue(NETWORK_INTERFACE);
  });

  afterEach(() => {
    jest.resetModules();
  });

  it(`creates a pcap session the first time a listener is added`, () => {
    let button = new DashButton(MAC_ADDRESS);
    button.addListener(() => {});

    expect(pcap.createSession.mock.calls.length).toBe(1);
  });

  it(`shares pcap sessions amongst buttons`, () => {
    let button1 = new DashButton(MAC_ADDRESS);
    button1.addListener(() => {});

    let button2 = new DashButton('66:77:88:99:aa:bb');
    button2.addListener(() => {});

    expect(pcap.createSession.mock.calls.length).toBe(1);
  });

  it(`notifies the appropriate listeners for each packet`, () => {
    let mockSession = createMockPcapSession();
    pcap.createSession.mockReturnValue(mockSession);

    let button1Listener = jest.genMockFunction();
    let button2Listener = jest.genMockFunction();

    let button1 = new DashButton(MAC_ADDRESS);
    button1.addListener(button1Listener);
    let button2 = new DashButton('66:77:88:99:aa:bb');
    button2.addListener(button2Listener);

    let packet1 = createMockArpProbe(MAC_ADDRESS);
    mockSession.emit('packet', packet1);
    expect(button1Listener.mock.calls.length).toBe(1);
    expect(button2Listener.mock.calls.length).toBe(0);

    let packet2 = createMockArpProbe('66:77:88:99:aa:bb');
    mockSession.emit('packet', packet2);
    expect(button1Listener.mock.calls.length).toBe(1);
    expect(button2Listener.mock.calls.length).toBe(1);
  });

  it(`waits for listeners for a prior packet to asynchronously complete ` +
     `before handling any new packets`, async () => {
    let mockSession = createMockPcapSession();
    pcap.createSession.mockReturnValue(mockSession);

    let button = new DashButton(MAC_ADDRESS);
    let calls = 0;
    button.addListener(() => { calls++; });

    let packet = createMockArpProbe(MAC_ADDRESS);
    mockSession.emit('packet', packet);
    expect(calls).toBe(1);
    mockSession.emit('packet', packet);
    expect(calls).toBe(1);
    await Promise.resolve();
    mockSession.emit('packet', packet);
    expect(calls).toBe(2);
  });

  it(`waits for all listeners even if some threw an error`, async () => {
    let mockSession = createMockPcapSession();
    pcap.createSession.mockReturnValue(mockSession);

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
    mockSession.emit('packet', packet);
    expect(listenerPromise).toBeDefined();
    let result = await listenerPromise;
    expect(result).toBe('success');
  });

  it(`runs its async listeners concurrently`, () => {
    let mockSession = createMockPcapSession();
    pcap.createSession.mockReturnValue(mockSession);

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
    let mockSession = createMockPcapSession();
    pcap.createSession.mockReturnValue(mockSession);

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
    let mockSession = createMockPcapSession();
    pcap.createSession.mockReturnValue(mockSession);

    let button = new DashButton(MAC_ADDRESS);
    let subscription = button.addListener(() => {});

    subscription.remove();
    expect(mockSession.listenerCount('packet')).toBe(0);
    expect(::subscription.remove).not.toThrow();
  });

  it(`closes the pcap session when no more buttons are listening`, () => {
    let mockSession = createMockPcapSession();
    pcap.createSession.mockReturnValue(mockSession);

    let button1Listener = jest.genMockFunction();
    let button2Listener = jest.genMockFunction();

    let button1 = new DashButton(MAC_ADDRESS);
    let subscription1 = button1.addListener(button1Listener);
    let button2 = new DashButton('66:77:88:99:aa:bb');
    let subscription2 = button2.addListener(button2Listener);

    subscription1.remove();
    expect(mockSession.close.mock.calls.length).toBe(0);
    subscription2.remove();
    expect(mockSession.close.mock.calls.length).toBe(1);
  });
});

function createMockPcapSession() {
  let session = new events.EventEmitter();
  session.close = jest.genMockFunction();
  return session;
}

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
