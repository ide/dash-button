// @flow
import pcap from 'pcap';

// Dash buttons send DHCPREQUEST messages (new) and ARP probes (old)
const PACKET_FILTER = '(arp or (udp and src port 68 and dst port 67 and udp[247:4] == 0x63350103)) and src host 0.0.0.0';

export default {
  createCaptureSession(interfaceName: string) {
    return pcap.createSession(interfaceName, PACKET_FILTER);
  },
};
