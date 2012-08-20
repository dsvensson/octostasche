var XmmsClient = function(ws) {
	var idx = 0;
	var outstanding = {};

	ws.onmessage = function(e) {
		var msg = JSON.parse(e.data);
		var idx = msg["id"];
		if (outstanding[idx] && outstanding[idx].complete) {
			outstanding[idx].complete(msg["result"]);
		}
		if (!outstanding[idx].broadcast) {
			delete outstanding[idx];
		}
	};

	var dispatch = function(cmd, params, result) {
		if (!result) {
			result = { id: idx };
			idx++;
		}
		var msg = JSON.stringify({ "id": result["id"], "method": cmd, "params": params || []});
		if (cmd.search("broadcast") != -1) {
			result.broadcast = true;
		}
		outstanding[result["id"]] = result;
		ws.send(msg);
		return result;
	};

	this.playlist = {
		listEntries: function(name) {
			return dispatch("playlist_list_entries", [name]);
		},
		move: function(from, to, playlist) {
			return dispatch("playlist_move", [from, to, playlist]);
		},
		setNext: function(position) {
			return dispatch("playlist_set_next", [position]);
		},
		setNextRelative: function(position) {
			return dispatch("playlist_set_next_rel", [position]);
		},
		changed: function() {
			return dispatch("broadcast_playlist_changed", []);
		},
		currentPosition: function(broadcast) {
			var result = dispatch("playlist_current_pos", []);
			if (broadcast)
				return dispatch("broadcast_playlist_current_pos", [], result);
			return result;
		}
	};
	this.medialib = {
		getInfo: function(mid) {
			return dispatch("medialib_get_info", [mid]);
		}
	};
	this.playback = {
		start: function() {
			return dispatch("playback_start", []);
		},
		pause: function() {
			return dispatch("playback_pause", []);
		},
		currentId: function(broadcast) {
			var result = dispatch("playback_current_id", []);
			if (broadcast)
				return dispatch("broadcast_playback_current_id", [], result);
			return result;
		},
		playTime: function(signal) {
			var result = dispatch("playback_playtime", []);
			if (signal)
				return dispatch("signal_playback_playtime", [], result);
			return result;
		},
		status: function(broadcast) {
			var result = dispatch("playback_status", []);
			if (broadcast)
				return dispatch("broadcast_playback_status", [], result);
			return result;
		},
		tickle: function() {
			return dispatch("playback_tickle", []);
		}
	};
};

XmmsClient.PlaybackStatus = {
	STOPPED: 0,
	PLAYING: 1,
	PAUSED: 2
};

XmmsClient.PlaylistChange = {
	ADD: 0,
	INSERT: 1,
	SHUFFLE: 2,
	REMOVE: 3,
	CLEAR: 4,
	MOVE: 5,
	SORT: 6,
	UPDATE: 7
};
