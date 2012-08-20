Ext.define('Octostasche.view.Playback', {
	extend: 'Ext.Container',
	alias: 'widget.playback',

	initComponent: function() {
		this.layout = {
			type: 'vbox',
			align: 'center',
			pack: 'center'
		};

		this.items = [{
			xtype: 'component',
			name: 'metadata',
			padding: 10,
			style: {
				'font-size': '14px',
				'text-shadow': '1px 1px 2px #999999'
			}
		}, {
			width: 400,
			height: 5,
			overflowX: 'auto',
			xtype: 'progressbar',
			value: 0.0,
			name: "playtime",
		}, {
			xtype: 'container',
			padding: 5,
			defaultType: 'button',
			width: 300,
			layout: {
				type: 'hbox',
				align: 'center',
				pack: 'center'
			},
			items: [{
				text: '<<',
				action: 'previous'
			}, {
				text: 'Play/Pause',
				action: 'play-pause'
			}, {
				text: '>>',
				action: 'next'
			}]
		}];

		this.callParent();
	}
});