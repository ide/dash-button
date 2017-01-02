// @flow
import padStart from 'lodash/padStart';

const MacAddresses = {
  getEthernetSource(packet: *): string {
    return MacAddresses.decimalToHex(packet.payload.shost.addr);
  },

  decimalToHex(numbers: Number[]): string {
    let hexStrings = numbers.map(decimal =>
      // TODO: Use String.prototype.padStart when Node natively supports it, and
      // increment the major semver version
      padStart(decimal.toString(16), 2, '0'),
    );
    return hexStrings.join(':');
  },
};

export default MacAddresses;
