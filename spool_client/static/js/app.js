/*
	requires:
		json2.js - https://github.com/douglascrockford/JSON-js
		beautify.js - https://github.com/einars/js-beautify/blob/master/beautify.js
	
	BUG:
	- I'm getting a conflict even when I edit a resource offline, go back online, save it successfully and then refresh - what should really happen is that the online resource gets merged in to the local
	
	TO-DO:
	- clicking a link in the unsynced resource area should load that resource into the editor
	- on a successful sync, the resource view should be refreshed (or at least show the new resource)
	- if the same resource is edited while offline more than once, it's name appears multiple times in the unsynced list - it should only appear once
	- er... turning off the wifi and then syncing (spool.updateCache) still returns 200 and data - is that because of the normal browser cache
	- calling that.updateCache should probably end up PUTing resources if the GET was successful
*/

$(document).ready(function() {

	var serverPath = "http://tiddlyweb.peermore.com/wiki",
		spool,
		$statusBar = $('#statusBar'),
		updateStatus = function(message) {
			$statusBar.text(message);
		},
		$resourceArea = $('#text'),
		$title = $('#title'),
		getResourceArea = function() {
			return $resourceArea.val();
		},
		updateResourceArea = function(data,href) {
			var title = data.title;
			if(typeof data==="object") {
				data = JSON.stringify(data);
			}
			data = js_beautify(data);
			$title.val(title);
			$resourceArea.val(data);
			$('button').data('href',href);
		},
		updateResourceList = function(paths, clear) {
			var listItems = [],
				$resourceList = $('#resourceList');
			$.each(paths, function(i, path) {
				listItems.push('<li><a href="'+path+'">'+decodeURIComponent(path)+'</a></li>');
			});
			if(clear) {
				$resourceList.html("");
			}
			$resourceList.append(listItems.join("\n"));
		},
		$unsyncedListContainer = $('#unsyncedListContainer'),
		$unsyncedList = $('#unsyncedList'),
		updateUnsyncedList = function(paths, remove) {
			var startingItems = $unsyncedList.find('li').length,
				endingItems;
			$.each(paths, function(i, path) {
				if(remove) {
					$unsyncedList.find('a[href='+path+']').closest('li').remove();
				} else {
					$unsyncedList.append('<li><a href="'+path+'">'+decodeURIComponent(path)+'</a></li>');
				}
			});
			endingItems = $unsyncedList.find('li').length;
			if(endingItems===0) {
				$unsyncedListContainer.find('p').show();
			} else {
				if(startingItems===0) {
					$unsyncedListContainer.find('p').hide();
				}
			}
		};
		
	// clear the textarea in case it has remembered some text
	$('#title').val('');
	$('#text').val('');
	
	$(document).bind("SpoolCacheLoaded", function(e, paths) {
		updateStatus("Cache loaded with "+paths.length+" resources");
		updateResourceList(paths, true);
	});
	
	$(document).bind("SpoolCacheRefreshing", function() {
		updateStatus("Updating cache");
	});
		
	$(document).bind('SpoolCacheUpdated', function(e, paths) {
		updateStatus("Cache updated with "+paths.length+" new resources");
		updateResourceList(paths,true);
	});

	$(document).bind("SpoolResourceSaved", function(e, paths) { // assuming this is only called with one resource, which it is at the moment
		updateStatus("Saved "+paths[0]+" to cache");
		updateUnsyncedList(paths);
	});
	
	$(document).bind("SpoolResourceSynced", function(e, paths) { // assuming this is only called with one resource, which it is at the moment
		updateStatus("Synced "+paths[0]+" to the web");
		updateUnsyncedList(paths, true);
	});
	
	$(document).bind("SpoolResourceSyncFail", function(e, paths) {
		updateStatus("Sync to "+paths[0]+" failed");
	});

	$('a').live('click', function(e) {
		e.preventDefault();
		var href = $(this).attr('href');
		updateStatus("Reading resource from "+href);
		$.ajax({
			url: href,
			success: function(data) {
				updateStatus("Loaded resource "+href);
				updateResourceArea(data,href);
			}
		});
		return false;
	});

	$('#save').click(function(e) {
		var url = $(this).data('href'),
			title = $('#title').val();
		if(!url) {
			return false; // this does mean that you need to have opened a resource and changed its title to save new resources
		}
		url = url.substring(0,url.lastIndexOf('/')+1)+title;
		e.preventDefault();
		$.ajax({
			url: url,
			type: 'put',
			data: getResourceArea(),
			processData: false,
			success: function() {
				console.log('success', arguments);
			},
			error: function() {
				console.log('failure', arguments);
			}
		});
		return false;
	});
	
	$('#sync').click(function(e) {
		if(spool) {
			spool.updateCache();
		}
		return false;
	});
	
	spool = new Spool({
		serverPath: serverPath,
		serverListPath: "/recipes/default/tiddlers.json?fat=1",
		parseList: function(tiddlers) {
			/*
				to handle an array of tiddlers like this:
				{
				    "revision": 146,
				    "created": "20090315191700",
				    "fields": {},
				    "creator": "cdent.tumblr.com",
				    "recipe": null,
				    "modified": "20090511125919",
				    "bag": "docs",
				    "title": "/",
				    "modifier": "cdent.tumblr.com",
				    "type": "None",
				    "tags": ["rep:html", "method:get", "httpapi"],
				    "permissions": ["read"]
				}
			*/
			var list = [],
				item;
			$.each(tiddlers, function(i, tiddler) {
				item = {
					path: "/bags/"+tiddler.bag+"/tiddlers/"+encodeURIComponent(tiddler.title),
					data: tiddler
				};
				list.push(item);
			});
			return list;
		},
		isNewer: function(local, remote) {
			return local.modified > remote.modified;
		},
		compareContent: function(local, remote) {
			var matchFields = [
					'title',
					'text',
					'tags',
					'fields',
					'creator',
					'modifier',
					'bag',
					'type'
				],
				equal = true;
			$.each(matchFields, function(i, field) {
				if(!Spool.objCompare(local[field],remote[field])) {
					equal = false;
					return false;
				}
			});
			return equal;
		}
	});

});