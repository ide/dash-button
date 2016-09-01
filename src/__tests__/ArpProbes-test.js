import pcap from 'pcap';

import ArpProbes from '../ArpProbes';

jest.mock('pcap');

describe('ArpProbes', () => {
  it(`creates a capture session for ARP probes`, () => {
    ArpProbes.createCaptureSession('en0');
    expect(pcap.createSession.mock.calls.length).toBe(1);
    expect(pcap.createSession.mock.calls[0][0]).toBe('en0');
    expect(pcap.createSession.mock.calls[0][1]).toBe('arp src host 0.0.0.0');
  });
});
