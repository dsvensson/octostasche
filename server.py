#!/usr/bin/env python
import  sys
sys.path.append("/opt/local/lib/python2.7/site-packages")
import tornado
import  os
import json
import cgi
from tornado.httpserver import HTTPServer
from tornado.ioloop import IOLoop
from tornado.web import Application
from tornado.websocket import WebSocketHandler

import xmmsclient

io_loop = IOLoop.instance()

class Handler(WebSocketHandler):
	def open(self):
		print "New connection opened."
		self.xc = xmmsclient.XMMS("test")
		self.xc.connect()

		self.xmms_loop = XmmsLoop(io_loop, self.xc)
		self.xmms_loop.start()

	def on_message(self, msg):
		cmd = json.loads(msg)
		self.dispatch(cmd["method"], cmd["params"], self.build_handler(cmd["method"], cmd["id"]))

	def build_handler(self, method, idx):
		if method == "medialib_get_info":
			def handle(v):
				if v.is_error():
					return self.send_error(idx, v.get_error())
				d = v.get_dict()
				p = v.value()
				n = {}
				for x in d:
					if isinstance(p[x], basestring):
						n[x] = cgi.escape(p[x])
					else:
						n[x] = p[x]
				return self.send_result(idx, n);
			return handle
		else:
			def handle(v):
				if v.is_error():
					return self.send_error(idx, v.get_error())
				return self.send_result(idx, v.value())
			return handle

	def dispatch(self, method, params, cb):
		print "dispatching: %s(%s)" % (method, ', '.join(str(x) for x in params))
		func = getattr(self.xc, method.replace(".", "_"))
		func(*params, cb=cb)

	def send_result(self, id_, data):
		self.write_message(json.dumps({"id": id_, "result": data}))

	def send_error(self, id_, error):
		self.write_message(json.dumps({"id": id_, "error": error}))

	def on_close(self):
		self.xmms_loop.stop()
		print "Connection closed."

class XmmsLoop(object):
	def __init__(self, io_loop, xmms):
		self.io_loop = io_loop
		self.xmms = xmms
		self.fd = xmms.get_fd()

	def start(self):
		self.io_loop.add_handler(self.fd, self.handle, IOLoop.READ | IOLoop.ERROR)
		self.xmms.set_need_out_fun(self.update_handler)

	def stop(self):
		self.io_loop.remove_handler(self.fd)
		self.xmms = None
		self.fd = None

	def update_handler(self, need_write):
		events = IOLoop.READ | IOLoop.ERROR
		if self.xmms.want_ioout():
			events |= IOLoop.WRITE
		self.io_loop.update_handler(self.fd, events)

	def handle(self, fd, events):
		if events & IOLoop.READ:
			self.xmms.ioin()
		if events & IOLoop.WRITE:
			self.xmms.ioout()

print "Server started."
HTTPServer(
	Application([
		("/socket", Handler),
		("/(.*)", tornado.web.StaticFileHandler, {"path": os.path.dirname(__file__)}),
	])
).listen(8080)

io_loop.start()
