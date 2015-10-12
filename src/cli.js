import pcap from 'pcap';
import yargs from 'yargs';

import ArpProbes from './ArpProbes';
import MacAddresses from './MacAddresses';
import NetworkInterfaces from './NetworkInterfaces';

if (require.main === module) {
  let parser = yargs
    .usage('Usage: $0 <command> [options]')
    .command('scan', 'Scan for ARP probes')
    .example(
      '$0 scan -i wlan0',
      'Scan for ARP probes on the given network interface'
    )
    .help('h')
    .alias('h', 'help')
    .version(() => require('../package.json').version)
    .alias('i', 'interface')
    .nargs('i', 1)
    .default('i', NetworkInterfaces.getDefault())
    .describe('i', 'The network interface on which to listen');
  let { argv } = parser;
  let commands = new Set(argv._);
  if (!commands.size) {
    console.log(parser.help());
  } else if (commands.has('scan')) {
    let pcapSession = ArpProbes.createCaptureSession(argv.interface);
    pcapSession.addListener('packet', rawPacket => {
      let fs = require('fs');
      fs.writeFileSync('/Users/ide/p.txt', JSON.stringify(rawPacket, null, 2), 'utf8');
      let packet = pcap.decode(rawPacket);
      console.log(packet);
      console.log(JSON.stringify(packet, null, 2));
      let sourceMacAddress = MacAddresses.getEthernetSource(packet);
      console.log('Detected an ARP probe from %s', sourceMacAddress);
    });
  }
}
