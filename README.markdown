Octostasche
===========

This is currently a crude little web ui hack that may have potential...

Running
-------

As simple as:

	$ python server.py

This will by default launch a web server on port 8080 which serves static
content and a websocket that kind of proxies the XMMS2 Python API.

Right, and you have to have the Python project Tornado (tornadoweb.org)
somewhere in your module path.

Features
--------

* Multi-select drag-n-drop reordering of playlist.
* Double click playlist entry to start playback.
* Sync playlist on changes (add/insert/sort/clear/shuffle...).
* Marker for the currently playing playlist entry.
