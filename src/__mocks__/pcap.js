import events from 'events';

let pcap = require.requireActual('pcap');

let pcapMock = jest.genMockFromModule('pcap');
pcapMock.decode = pcap.decode;

pcapMock.createSession.mockImplementation((interfaceName, filter = '') => {
  let session = new events.EventEmitter();
  session.device_name = interfaceName;
  session.filter = filter;
  session.close = jest.genMockFunction();
  return session;
});

export default pcapMock;
