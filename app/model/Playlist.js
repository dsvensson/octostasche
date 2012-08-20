Ext.define('Octostasche.model.Playlist', {
	extend: 'Ext.data.Model',
	requires: ['Ext.data.SequentialIdGenerator'],
	idgen: 'sequential',
	fields: [
		{name: 'mid',     type: 'int'    },
		{name: 'playing', type: 'string' },
		{name: 'artist',  type: 'string' },
		{name: 'album',   type: 'string' },
		{name: 'title',   type: 'string' },
		{name: 'tracknr', type: 'int'    }
	],
});
