Ext.define('Octostasche.view.Viewport', {
    extend: 'Ext.container.Viewport',
    requires: [
        'Octostasche.view.Playback',
        'Octostasche.view.Playlist',
    ],
    layout: 'fit',

    initComponent: function() {
        this.items = {
            xtype: 'panel',
            dockedItems: [{
                dock: 'top',
                xtype: 'toolbar',
                height: 80,
                items: [{
                    xtype: 'playback',
                    height: 70,
                    flex: 1
                }]
            }],
            layout: {
                type: 'vbox',
                align: 'stretch'
            },
            items: [{
                xtype: 'playlist',
				flex: 1
			}]
        };
        this.callParent();
    }
});