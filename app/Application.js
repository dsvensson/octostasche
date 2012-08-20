var ws = new WebSocket("ws://" + location.host + "/socket");

ws.onopen = function() {
	Ext.Loader.setConfig({enabled:true});

	Ext.application({
		name: 'Octostasche',

		autoCreateViewport: true,

		models: ['Playlist'],
		stores: ['Playlist'],
		controllers: ['Playlist', 'Playback'],

		xc: new XmmsClient(ws)
	});
};