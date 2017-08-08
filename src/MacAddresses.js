// @flow

const MacAddresses = {
  getEthernetSource(packet: *): string {
    return MacAddresses.decimalToHex(packet.payload.shost.addr);
  },

  decimalToHex(numbers: number[]): string {
    let hexStrings = numbers.map(decimal => decimal.toString(16).padStart(2, '0'));
    return hexStrings.join(':');
  },
};

export default MacAddresses;
