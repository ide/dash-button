export function getEthernetSource(packet: any): string {
  return decimalToHex(packet.payload.shost.addr);
}

export function decimalToHex(numbers: number[]): string {
  let hexStrings = numbers.map(decimal => decimal.toString(16).padStart(2, '0'));
  return hexStrings.join(':');
}
