let pcap = require.requireActual('pcap');

let pcapMock = jest.genMockFromModule('pcap');
pcapMock.decode = pcap.decode;

export default pcapMock;
