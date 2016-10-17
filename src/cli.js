#!/usr/bin/env node
import pcap from 'pcap';
import yargs from 'yargs';

import MacAddresses from './MacAddresses';
import NetworkInterfaces from './NetworkInterfaces';
import Packets from './Packets';

if (require.main === module) {
  let parser = yargs
    .usage('Usage: $0 <command> [options]')
    .command('scan', 'Scan for ARP probes')
    .example(
      '$0 scan -i wlan0',
      'Scan for ARP probes on the given network interface',
    )
    .help()
    .alias('h', 'help')
    .version()
    .option('i', {
      alias: 'interface',
      nargs: 1,
      default: NetworkInterfaces.getDefault(),
      describe: 'The network interface on which to listen',
      global: true,
    });
  let { argv } = parser;
  let commands = new Set(argv._);
  if (!commands.size) {
    parser.showHelp();
  } else if (commands.has('scan')) {
    let interfaceName = argv.interface;
    let pcapSession = Packets.createCaptureSession(interfaceName);
    pcapSession.addListener('packet', rawPacket => {
      let packet = pcap.decode(rawPacket);
      // console.log('Buffer:', packet.payload.payload.payload.data.toString('hex'));
      let sourceMacAddress = MacAddresses.getEthernetSource(packet);
      console.log('Detected an ARP probe from %s', sourceMacAddress);
    });
    console.log('Scanning for ARP probes on %s...', interfaceName);
  }
}
