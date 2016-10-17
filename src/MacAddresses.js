// @flow
import padStart from 'lodash/padStart';

let MacAddresses = {
  getEthernetSource(packet): string {
    return MacAddresses.decimalToHex(packet.payload.shost.addr);
  },

  decimalToHex(numbers: Number[]): string {
    let hexStrings = numbers.map(decimal =>
      padStart(decimal.toString(16), 2, '0'),
    );
    return hexStrings.join(':');
  },
};

export default MacAddresses;
