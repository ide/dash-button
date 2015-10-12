import pcap from 'pcap';

const ARP_PROBE_FILTER = 'arp src host 0.0.0.0';

export default {
  createCaptureSession(interfaceName: string) {
    return pcap.createSession(interfaceName, ARP_PROBE_FILTER);
  },
};
