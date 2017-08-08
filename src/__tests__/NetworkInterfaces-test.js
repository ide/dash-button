import os from 'os';

import NetworkInterfaces from '../NetworkInterfaces';

jest.mock('os');

describe('NetworkInterfaces', () => {
  it(`returns null if it can't find an external interface`, () => {
    os.networkInterfaces.mockImplementation(() => {
      return { lo0: loopbackInterfaces };
    });

    let interfaceName = NetworkInterfaces.getDefault();
    expect(interfaceName).toBe(null);
  });

  it(`returns the first external interface it finds`, () => {
    os.networkInterfaces.mockImplementation(() => {
      return { lo0: loopbackInterfaces, en0: wifiInterfaces };
    });

    let interfaceName = NetworkInterfaces.getDefault();
    expect(interfaceName).toBe('en0');
  });
});

let loopbackInterfaces = [
  {
    address: '::1',
    netmask: 'ffff:ffff:ffff:ffff:ffff:ffff:ffff:ffff',
    family: 'IPv6',
    mac: '00:00:00:00:00:00',
    scopeid: 0,
    internal: true,
  },
  {
    address: '127.0.0.1',
    netmask: '255.0.0.0',
    family: 'IPv4',
    mac: '00:00:00:00:00:00',
    internal: true,
  },
  {
    address: 'fe80::1',
    netmask: 'ffff:ffff:ffff:ffff::',
    family: 'IPv6',
    mac: '00:00:00:00:00:00',
    scopeid: 1,
    internal: true,
  },
];

let wifiInterfaces = [
  {
    address: 'fe80::bae8:56ff:fe37:84c0',
    netmask: 'ffff:ffff:ffff:ffff::',
    family: 'IPv6',
    mac: 'b8:e8:56:37:84:c0',
    scopeid: 4,
    internal: false,
  },
  {
    address: '192.168.1.206',
    netmask: '255.255.255.0',
    family: 'IPv4',
    mac: 'b8:e8:56:37:84:c0',
    internal: false,
  },
];
