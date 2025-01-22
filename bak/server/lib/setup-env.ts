import WebSocket from 'ws';

// Mock browser environment for Webex SDK
if (typeof window === 'undefined') {
  const mockWindow = {
    location: {
      protocol: 'https:',
      hostname: 'localhost',
      href: 'https://localhost',
      origin: 'https://localhost',
      pathname: '/',
      search: '',
      hash: '',
    },
    navigator: {
      userAgent: 'Node.js',
      mediaDevices: {
        getUserMedia: async () => null,
        enumerateDevices: async () => [],
      },
    },
    document: {
      createElement: () => ({
        style: {},
        setAttribute: () => {},
        getElementsByTagName: () => [],
        addEventListener: () => {},
        removeEventListener: () => {},
        dispatchEvent: () => true,
      }),
      getElementsByTagName: () => [],
      domain: 'localhost',
      addEventListener: () => {},
      removeEventListener: () => {},
    },
    localStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    sessionStorage: {
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    },
    WebSocket: WebSocket,
    atob: (str: string) => Buffer.from(str, 'base64').toString('binary'),
    btoa: (str: string) => Buffer.from(str, 'binary').toString('base64'),
    fetch: () => Promise.resolve(new Response()),
    Response: class {},
    Headers: class {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => true,
  };

  // Assign all properties from mockWindow to global
  Object.assign(global, mockWindow);
  (global as any).window = mockWindow;
  global.self = mockWindow;

  // Additional required globals
  global.HTMLElement = class {};
  global.HTMLVideoElement = class {};
  global.HTMLAudioElement = class {};
  global.HTMLIFrameElement = class {};
  global.Image = class {};
  global.Audio = class {};
  global.FileReader = class {};
  global.Blob = class {};
  global.Event = class {};
  global.CustomEvent = class extends Event {};
  global.MediaStream = class {};
  global.RTCPeerConnection = class {};
  global.RTCSessionDescription = class {};
  global.URL = class {
    static createObjectURL() { return ''; }
    static revokeObjectURL() {}
  };
  
  // Set WebSocket globally as well
  global.WebSocket = WebSocket;
} 