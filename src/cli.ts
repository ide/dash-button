#!/usr/bin/env node
import pcap from 'pcap';
import yargs from 'yargs';

import * as MacAddresses from './MacAddresses';
import * as NetworkInterfaces from './NetworkInterfaces';
import * as Packets from './Packets';

if (require.main === module) {
  let parser = yargs
    .usage('Usage: $0 <command> [options]')
    .command('scan', 'Scan for DHCP requests and ARP probes')
    .example(
      '$0 scan -i wlan0',
      'Scan for DHCP requests and ARP probes on the given network interface'
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
    let interfaceName = argv.interface as string;
    let pcapSession = Packets.createCaptureSession(interfaceName);
    pcapSession.addListener('packet', rawPacket => {
      let packet = pcap.decode(rawPacket);
      // console.log('Buffer:', packet.payload.payload.payload.data.toString('hex'));
      let sourceMacAddress = MacAddresses.getEthernetSource(packet);
      console.log('Detected a DHCP request or ARP probe from %s', sourceMacAddress);
    });
    console.log('Scanning for DHCP requests and ARP probes on %s...', interfaceName);
  }
}
