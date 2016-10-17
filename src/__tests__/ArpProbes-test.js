import pcap from 'pcap';

import Packets from '../Packets';

jest.mock('pcap');

describe('Packets', () => {
  it(`creates a capture session for DHCP requests and ARP probes`, () => {
    Packets.createCaptureSession('en0');
    expect(pcap.createSession.mock.calls.length).toBe(1);
    expect(pcap.createSession.mock.calls[0][0]).toBe('en0');
    expect(pcap.createSession.mock.calls[0][1]).toBe(
      '(arp or (udp and src port 68 and dst port 67 and udp[247:4] == 0x63350103)) and src host 0.0.0.0'
    );
  });
});
