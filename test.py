#from websocket import ThreadedWebSocketHandler
import SocketServer
import xmmsclient
import threading
import select
import hashlib
import logging
import re
import struct
import json
import urllib

def string_to_header(data):
    data = data.split('\r\n\r\n', 1)
    lines = data[0].split('\r\n')
    headers = {}
    for line in lines:
        i = line.find(':')
        if i > 0:
            headers[line[:i].lower()] = line[i+1:].strip()
    return headers

def generate_handshake_key(headers, data):
    if ('sec-websocket-key1' not in headers and 'sec-websocket-key2' not in headers):
        return False
    digitRe = re.compile(r'[^0-9]')
    spacesRe = re.compile(r'\s')
    key1 = headers['sec-websocket-key1']
    key2 = headers['sec-websocket-key2']
    #print "key1 = %s and key 2 = %s" % (key1,key2)
    end = data
    space1 = len(spacesRe.findall(key1))
    space2 = len(spacesRe.findall(key2))
    key1 = int(digitRe.sub('', key1))
    key2 = int(digitRe.sub('', key2))
    if (space1 == 0 or space2 == 0 or key1 % space1 != 0 or key2 % space2 != 0):
        return False
    pkey1 = key1/space1
    pkey2 = key2/space2

    catstring = struct.pack('!L',pkey1) + struct.pack('!L',pkey2) + end
    magic = hashlib.md5(catstring).digest()
    return magic

def handshake(host, port, data):
    data = data.strip()
    logging.debug('Handshake - request: %s' % data)
    headers = string_to_header(data)
    if ('origin' not in headers):
        return False
    key = generate_handshake_key(headers, data.split('\r\n')[-1])

    # header['host'] instead of HOST?
    # http://code.google.com/p/phpwebsocket/source/browse/trunk/%20phpwebsocket/server.php
    handshake = (
        "HTTP/1.1 101 WebSocket Protocol Handshake\r\n"
        "Upgrade: WebSocket\r\n"
        "Connection: Upgrade\r\n"
        "WebSocket-Origin: %(origin)s\r\n"
        "WebSocket-Location: ws://%(host)s:%(port)s/\r\n"
        "Sec-Websocket-Origin: %(origin)s\r\n"
        "Sec-Websocket-Location: ws://%(host)s:%(port)s/\r\n"
        "\r\n"
        "%(key)s"
    ) % {'origin': headers['origin'], 'host': host, 'port': port, 'key': key}
    logging.debug('Handshake - response: %s' % handshake)
    return handshake

class WebSocketServer(object):
    def __init__(self, socket, host, port, xc):
        self.host = host
        self.port = port
        self.socket = socket
        self.fileno = socket.fileno()
        self.xc = xc
        self.established = False
        self.buffer = ''

    def get_selectors(self):
        r, w, e = self.xc.get_selectors()
        return [self.fileno] + r, w, e

    def handle(self, in_, out_):
        if self.fileno in in_:
            self.read()
        self.xc.handle(in_, out_)

    def read(self):
        self.socket.setblocking(False)
        self.buffer += self.socket.recv(1024)
        self.socket.setblocking(True)
        if not self.established:
            self.handshake()
        elif self.buffer:
            self.commands()
        else:
            raise RuntimeError("disconnected")

    def send(self, data):
        self.socket.send(data)

    def send_as_json(self, id_, data):
        self.socket.send("\x00" + json.dumps({"id": id_, "result": data}) + "\xff")

    def handshake(self):
        response = handshake(self.host, self.port, self.buffer)
        if response:
            self.buffer = ''
            self.established = True
            self.send(response)

    def build_handler(self, method, idx):
        if method == "medialib_get_info":
            def handle(v):
                d = v.get_dict()
                p = v.value()
                n = {}
                for x in d:
                    if isinstance(p[x], basestring):
                        n[x] = urllib.quote(p[x])
                    else:
                        n[x] = p[x]
                self.send_as_json(idx, n);
            return handle
        else:
            def handle(v):
                return self.send_as_json(idx, v.value())
            return handle

    def commands(self):
        end = self.buffer.rindex("\xff")
        for msg in self.buffer.split("\xff"):
            if not msg:
                continue
            msg = msg[1:]
            cmd = json.loads(msg)
            self.xc.dispatch(cmd["method"], cmd["params"], self.build_handler(cmd["method"], cmd["id"]))
        self.buffer = self.buffer[end+1:]

class XmmsConnector(object):
    def __init__(self, name):
        self.xc = xmmsclient.XMMS(name)
        self.xc.connect()
        self.fileno = self.xc.get_fd()

    def get_selectors(self):
        if self.xc.want_ioout():
            return [self.fileno], [self.fileno], [self.fileno]
        return [self.fileno], [], [self.fileno]

    def handle(self, in_, out_):
        if self.fileno in in_:
            self.xc.ioin()
        if self.fileno in out_:
            self.xc.ioout()

    def dispatch(self, method, params, cb):
        func = getattr(self.xc, method.replace(".", "_"))
        func(*params, cb=cb)

class WebSocketHandler(SocketServer.BaseRequestHandler):
    def setup(self):
        host, port = self.server.server_address
        self.ws = WebSocketServer(self.request, host, port,
                                  XmmsConnector("websocket-%d" % self.request.fileno()))

    def handle(self):
        try:
            while True:
                r, w, e = self.ws.get_selectors()
                (in_, out_, err_) = select.select(r, w, e, 100)
                if err_:
                    return False

                self.ws.handle(in_, out_)
        except Exception, e:
            print "error", e

        print "WebSocket Client exited..."

class ThreadedTCPServer(SocketServer.ThreadingMixIn, SocketServer.TCPServer):
    pass

server = ThreadedTCPServer(("127.0.0.1", 9999), WebSocketHandler, False)
server.allow_reuse_address = True
server.server_bind()
server.server_activate()
server.serve_forever()
