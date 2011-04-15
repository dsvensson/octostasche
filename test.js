var xmmsclient = function(ws) {
    this.PlaylistChange = {
        ADD: 0,
        INSERT: 1,
        SHUFFLE: 2,
        REMOVE: 3,
        CLEAR: 4,
        MOVE: 5,
        SORT: 6,
        UPDATE: 7
    };
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
        if (cmd.search("broadcast")) {
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
        setNext: function(position) {
            return dispatch("playlist_set_next", [position]);
        },
        changed: function() {
            return dispatch("broadcast_playlist_changed", []);
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

dojo.addOnLoad(function() {

    var ws = new WebSocket("ws://127.0.0.1:9999/");
    ws.onopen = function() {
        var xc = new xmmsclient(ws);

        var playlistModel = new dojo.data.ItemFileWriteStore({
            data: { identifier: "mid", items: [] }
        });

        playlistView.setStore(playlistModel);

        dojo.connect(playlistView, "onRowClick", function(event) {
            xc.playlist.setNext(event.rowIndex);
            xc.playback.tickle();
            xc.playback.start();
        });

        xc.playlist.listEntries().complete = function(entries) {
            for (var i=0; i < entries.length; i++) {
                xc.medialib.getInfo(entries[i]).complete = function(data) {
                    playlistModel.newItem({
                        mid: data["id"], artist: data["artist"], album: data["album"], title: data["title"]
                    });
                };
            }
        };

        xc.playlist.changed().complete = function(change) {
            if (change.type == xc.PlaylistChange.ADD) {
                console.log(change.id);
                xc.medialib.getInfo(change.id).complete = function(data) {
                    console.log(data);
                    playlistModel.newItem({
                        mid: data["id"], artist: data["artist"], album: data["album"], title: data["title"]
                    });
                };
            } else if (change.type == xc.PlaylistChange.CLEAR) {
                playlistModel.fetch({onComplete: function(items) {
                    dojo.map(items, function(item) {
                        playlistModel.deleteItem(item);
                    });
                }});
            }
        };

        xc.playback.currentId(true).complete = function(mid) {
            xc.medialib.getInfo(mid).complete = function(data) {
                var node = dojo.byId("current-metadata");
                node.innerHTML = data["artist"] + " // " + data["album"] + " // " + data["title"];
            };
        };

        xc.playback.playTime(true).complete = function(time) {
            var node = dojo.byId("playtime");
            var seconds = time / 1000.0;
            node.innerHTML = dojox.string.sprintf("%02d:%02d", seconds / 60, seconds % 60);
        };

        xc.playback.status(true).complete = function(status) {
            var node = dojo.byId("status");
            var mapper = {
                0: "STOPPED",
                1: "PLAYING",
                2: "PAUSED"
            };
            node.innerHTML = mapper[status];
        };
    };
});