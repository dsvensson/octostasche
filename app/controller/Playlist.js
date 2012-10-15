Ext.define('Octostasche.controller.Playlist', {
	extend: 'Ext.app.Controller',
	requires: ['Ext.Function'],

	stores: ['Playlist'],

	refs: [{
		selector: 'playlist',
		ref: 'playlistGrid'
	}],

	currentPosition: 0,

	init: function() {
		this.control({
			'playlist dataview': {
				beforedrop: this.onPlaylistReorder,
				itemdblclick: this.onPlaylistJump
			},
		});

		this.getPlaylistStore().on("add", this.onEntryAdded, this);

		this.application.xc.playlist.changed().complete = Ext.Function.bind(this.onPlaylistChange, this);
		this.application.xc.playlist.listEntries().complete = Ext.Function.bind(this.onRefreshPlaylist, this);
		this.application.xc.playlist.currentPosition(true).complete = Ext.Function.bind(this.onPlaylistPositionChanged, this);
	},

	onEntryAdded: function(store, objs, idx, opts) {
		var gen_metadata_func = function(obj) {
			return function(data) {
				obj.set("artist", data.artist);
				obj.set("album", data.album);
				obj.set("title", data.title);
				obj.set("tracknr", data.tracknr);
				obj.commit();
			};
		}

		for (i = 0; i < objs.length; i++) {
			this.application.xc.medialib.getInfo(objs[i].get("mid")).complete = gen_metadata_func(objs[i]);
		}
	},

	onPlaylistChange: function(change) {
		var store = this.getPlaylistStore();
		var grid = this.getPlaylistGrid();

		if (change.type == XmmsClient.PlaylistChange.ADD) {
			store.add({ mid: change.id });
		} else if (change.type == XmmsClient.PlaylistChange.INSERT) {
			store.insert(change.position, { mid: change.id });
		} else if (change.type == XmmsClient.PlaylistChange.MOVE) {
			var row = store.getAt(change.position);
			store.remove(row);
			store.insert(change.newposition, row);
			grid.getView().refresh();
		} else if (change.type == XmmsClient.PlaylistChange.REMOVE) {
			var row = store.getAt(change.position);
			store.remove(row);
		} else {
			/* Something else.. a refresh is probably what we want */
			this.application.xc.playlist.listEntries().complete = Ext.Function.bind(this.onRefreshPlaylist, this);
		}
	},

	onRefreshPlaylist: function(entries) {
		var store = this.getPlaylistStore();
		store.removeAll();

		var rows = []
		for (i = 0; i < entries.length; i++)
			rows.push({ mid: entries[i] });

		store.add(rows);
	},

	onPlaylistReorder: function(node, data, overModel, dropPosition, dropFunction, eOpts) {
		dropFunction.cancelDrop();

		var store = this.getPlaylistStore();

		var downward = 0;
		var upward = 0;

		var destination = store.indexOf(overModel);
		if (dropPosition == "after")
			destination++;

		for (i = 0; i < data.records.length; i++) {
			var source = store.indexOf(data.records[i]);
			if (source < destination) {
				this.application.xc.playlist.move(source - downward, destination - 1);
				downward++;
			} else {
				this.application.xc.playlist.move(source, destination + upward);
				upward++;
			}
		}

		return 0;
	},

	onPlaylistJump: function(view, record, item, index, event, opts) {
		var store = this.getPlaylistStore();
		var position = store.indexOf(record);
		this.application.xc.playlist.setNext(position);
		this.application.xc.playback.tickle();
		this.application.xc.playback.start();
	},

	onPlaylistPositionChanged: function(args) {
		var store = this.getPlaylistStore();

		if (this.currentPosition != 0) {
			var record = store.getAt(this.currentPosition);
			record.set("playing", "");
			record.commit();
		}

		if (args.position > 0) {
			var record = store.getAt(args.position);
			record.set("playing", "<p style='color: #55bb88; font-size: 14px'>♬</p>");
			record.commit();
		}

		this.currentPosition = args.position;
	}
});