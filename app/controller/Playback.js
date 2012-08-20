Ext.define('Octostasche.controller.Playback', {
	extend: 'Ext.app.Controller',
	requires: ['Ext.Function', 'Ext.util.TaskRunner'],

	duration: 0,

	refs: [{
		selector: 'playback progressbar[name=playtime]',
		ref: 'progressBar'
	}, {
		selector: 'playback component[name=metadata]',
		ref: 'metadata'
	}, {
		selector: 'playback button[action=play-pause]',
		ref: 'togglePlayback'
	}],

	init: function() {
		this.control({
			'button[action=previous]': {
				click: this.onPreviousClick
			},
			'button[action=play-pause]': {
				click: this.onTogglePlayClick
			},
			'button[action=next]': {
				click: this.onNextClick
			}
		});

		var runner = new Ext.util.TaskRunner();
		runner.start({ run: this.onPlaytimeInvalidate, scope: this, interval: 900 });

		this.application.xc.playback.currentId(true).complete = Ext.Function.bind(this.onCurrentIdChanged, this);
		this.application.xc.playback.status(true).complete = Ext.Function.bind(this.onStatusChanged, this);
	},

	onStatusChanged: function(status) {
		var button = this.getTogglePlayback();
		if (status == XmmsClient.PlaybackStatus.PLAYING) {
			button.setText("Pause");
		} else {
			button.setText("Play");
		}
		this.status = status;
	},

	onCurrentIdChanged: function(mid) {
		this.application.xc.medialib.getInfo(mid).complete = Ext.Function.bind(this.onCurrentMetadataChanged, this);
	},

	onCurrentMetadataChanged: function(data) {
		this.duration = data.duration;

		var metadata = this.getMetadata();
		if (!data.title || data.title.length == 0) {
			metadata.update(data.url);
		} else {
			var parts = []
			if (data.artist && data.artist.length > 0)
				parts.push(data.artist);
			if (data.album && data.album.length > 0)
				parts.push(data.album);
			if (data.title && data.title.length > 0)
				parts.push(data.title);
			metadata.update(parts.join(" <i> // </i> "));
		}
	},

	onTogglePlayClick: function() {
		if (this.status == XmmsClient.PlaybackStatus.PLAYING) {
			this.application.xc.playback.pause();
		} else {
			this.application.xc.playback.start();
		}
	},

	onPreviousClick: function() {
		this.application.xc.playlist.setNextRelative(-1);
		this.application.xc.playback.tickle();
	},

	onNextClick: function() {
		this.application.xc.playlist.setNextRelative(1);
		this.application.xc.playback.tickle();
	},

	onPlaytimeInvalidate: function() {
		this.application.xc.playback.playTime().complete = Ext.Function.bind(this.onPlaytimeUpdate, this);
	},

	onPlaytimeUpdate: function(ms) {
		if (this.duration > 0) {
			var progressbar = this.getProgressBar();
			progressbar.updateProgress(ms * 1.0 / this.duration);
		}
	}
});
