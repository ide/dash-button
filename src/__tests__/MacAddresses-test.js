import MacAddresses from '../MacAddresses';

describe('MacAddresses', () => {
  it(`converts arrays of decimal numbers to hex strings`, () => {
    let decimals = [115, 107, 32, 146, 92, 19];
    let hex = MacAddresses.decimalToHex(decimals);
    expect(hex).toBe('73:6b:20:92:5c:13');
  });

  it(`left-pads hex digits with zeros`, () => {
    let decimals = [0, 1, 2, 3, 4, 5];
    let hex = MacAddresses.decimalToHex(decimals);
    expect(hex).toBe('00:01:02:03:04:05');
  });
});
