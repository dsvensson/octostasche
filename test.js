Ext.require([
	'Ext.grid.*',
	'Ext.data.*',
	'Ext.util.*',
	'Ext.state.*'
]);

Ext.define('Playlist', {
	extend: 'Ext.data.Model',
	requires: ['Ext.data.SequentialIdGenerator'],
	idgen: 'sequential',
	fields: [
		{name: 'mid', type: 'int'},
		{name: 'artist', type: 'string' },
		{name: 'album', type: 'string'	},
		{name: 'title', type: 'string'	},
		{name: 'tracknr', type: 'int'  },
	],
});

Ext.onReady(function() {
	Ext.QuickTips.init();

	var store = Ext.create('Ext.data.ArrayStore', {
		model: 'Playlist', data: []
	});

	var grid = Ext.create('Ext.grid.Panel', {
		store: store,
		stateful: true,
		collapsible: true,
		multiSelect: true,
		stateId: 'stateGrid',
		columns: [
			new Ext.grid.RowNumberer(),
			{ text: 'Artist',  flex: 1,	 sortable: false, dataIndex: 'artist'  },
			{ text: 'Album',   flex: 1,	 sortable: false, dataIndex: 'album'   },
			{ text: 'Title',   flex: 1,	 sortable: false, dataIndex: 'title'   },
			{ text: '#',	  width: 50, sortable: false, dataIndex: 'tracknr' }
		],
		title: 'Playlist',
		renderTo: 'grid-example',
		viewConfig: {
			stripeRows: true,
			enableTextSelection: true,
			plugins: {
				ptype: 'gridviewdragdrop',
				dragText: 'Drag and drop to reorganize'
			}
		}
	});


	var ws = new WebSocket("ws://127.0.0.1:8080/socket");
	ws.onopen = function() {
		var xc = new XmmsClient(ws);

		grid.view.on("beforedrop", function(node, data, overModel, dropPosition, dropFunction, eOpts) {
			dropFunction.cancelDrop();

			var downward = 0;
			var upward = 0;

			var destination = store.indexOf(overModel);
			if (dropPosition == "after")
				destination++;

			for (i = 0; i < data.records.length; i++) {
				var source = store.indexOf(data.records[i]);
				if (source < destination) {
					xc.playlist.move(source - downward, destination - 1);
					downward++;
				} else {
					xc.playlist.move(source, destination + upward);
					upward++;
				}
			}

			return 0;
		});

		grid.view.on("itemdblclick", function(view, record, item, index, event, opts) {
			xc.playlist.setNext(store.indexOf(record));
			xc.playback.tickle();
			xc.playback.start();
		});

		store.on("add", function(store, objs, idx, opts) {
			var handle_metadata = function(obj) {
				return function(data) {
					obj.set("artist", data.artist);
					obj.set("album", data.album);
					obj.set("title", data.title);
					obj.set("tracknr", data.tracknr);
					obj.commit();
				};
			}

			for (i = 0; i < objs.length; i++) {
				var pos = idx + i;
				//console.log("resolving", idx, i, pos, objs[pos], objs, opts, idx);
				xc.medialib.getInfo(objs[i].data.mid).complete = handle_metadata(objs[i]);
			}
		});

		xc.playlist.listEntries().complete = function(entries) {
			var rows = []
			for (i = 0; i < entries.length; i++)
				rows.push({ mid: entries[i] });
			store.add(rows);
		};

		xc.playlist.changed().complete = function(change) {
			console.log("Playlist change:", change);
			if (change.type == xc.PlaylistChange.ADD) {
				store.add({ mid: change.id });
			} else if (change.type == xc.PlaylistChange.INSERT) {
				store.insert(change.position, { mid: change.id });
			} else if (change.type == xc.PlaylistChange.MOVE) {
				var row = store.getAt(change.position);
				store.remove(row);
				store.insert(change.newposition, row);
				grid.view.refresh();
			} else if (change.type == xc.PlaylistChange.CLEAR) {
				store.removeAll();
			} else if (change.type == xc.PlaylistChange.SORT) {
				store.removeAll();
				xc.playlist.listEntries().complete = function(entries) {
					var rows = []
					for (i = 0; i < entries.length; i++)
						rows.push({ mid: entries[i] });
					store.add(rows);
				};
			}
		};
	};
});
