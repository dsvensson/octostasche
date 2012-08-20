Ext.define('Octostasche.view.Playlist', {
	extend: 'Ext.grid.Panel',
	alias: 'widget.playlist',
	store: 'Playlist',
	stateful: true,
	collapsible: true,
	multiSelect: true,
	stateId: 'stateGrid',
	columns: [
		new Ext.grid.RowNumberer({ width: 35 }),
		{ text: '',       width: 25, sortable: false, dataIndex: 'playing' },
		{ text: 'Artist',  flex: 1,  sortable: false, dataIndex: 'artist'  },
		{ text: 'Album',   flex: 1,  sortable: false, dataIndex: 'album'   },
		{ text: 'Title',   flex: 1,  sortable: false, dataIndex: 'title'   },
		{ text: '#',      width: 50, sortable: false, dataIndex: 'tracknr' }
	],
	title: 'Playlist',
	viewConfig: {
		stripeRows: true,
		enableTextSelection: false,
		plugins: {
			ptype: 'gridviewdragdrop',
			dragText: 'Drag and drop to reorganize'
		}
	}
});
