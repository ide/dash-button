import pcap from 'pcap';
import yargs from 'yargs';

import NetworkInterfaces from './NetworkInterfaces';

if (require.main === module) {
  let argv = yargs
    .usage('Usage: $0 <command> [options]')
    .command('scan', 'Scan for ARP probes')
    .example(
      '$0 scan -i wlan0',
      'Scan for ARP probes on the given network interface'
    )
    .alias('i', 'interface')
    .nargs('i', 1)
    .default('i', NetworkInterfaces.getDefault())
    .describe('i', 'The network interface on which to listen')
    .help('h')
    .alias('h', 'help')
    .argv;
  let commands = new Set(argv._);
  if (commands.has('scan')) {
    let pcapSession = pcap.createSession(argv.interface, 'arp');
    pcapSession.addListener('packet', rawPacket => {
      console.log(rawPacket);
    });
  }
}
