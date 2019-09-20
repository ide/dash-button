import events from 'events';

let pcap = require.requireActual('pcap') as any;

let pcapMock = jest.genMockFromModule('pcap') as any;
pcapMock.decode = pcap.decode;

pcapMock.createSession.mockImplementation((interfaceName, filter = '') => {
  let session = new events.EventEmitter() as any;
  session.device_name = interfaceName;
  session.filter = filter;
  session.close = jest.fn();
  return session;
});

export default pcapMock;
