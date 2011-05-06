/*
	requires:
		json2.js - https://github.com/douglascrockford/JSON-js
		beautify.js - https://github.com/einars/js-beautify/blob/master/beautify.js
*/

$(document).ready(function() {

	var serverPath = "http://tiddlyweb.peermore.com/wiki",
		spool,
		$statusBar = $('#statusBar'),
		updateStatus = function(message) {
			$statusBar.text(message);
		},
		$resourceArea = $('textarea'),
		getResourceArea = function() {
			return $resourceArea.val();
		},
		updateResourceArea = function(data,href) {
			if(typeof data==="object") {
				data = JSON.stringify(data);
			}
			data = js_beautify(data);
			$resourceArea.val(data);
			$('button').data('href',href);
		},
		updateResourceList = function(paths, clear) {
			var listItems = [];
			$.each(paths, function(i, path) {
				listItems.push('<li><a href="'+path+'">'+decodeURIComponent(path)+'</a></li>');
			});
			if(clear) {
				$('#resourceList').html("");
			}
			$('#resourceList').append(listItems.join("\n"));
		},
		$unsyncedList = $('#unsyncedList'),
		updateUnsyncedList = function(paths, remove) {
			$.each(paths, function(i, path) {
				if(remove) {
					$unsyncedList.find('a[href='+path+']').remove();
				} else {
					$unsyncedList.append('<li><a href="'+path+'">'+decodeURIComponent(path)+'</a></li>');
				}
			});
		};
	
	$(document).bind("SpoolCacheLoaded", function(e, paths) {
		updateStatus("Cache loaded with "+paths.length+" resources");
		updateResourceList(paths, true);
	});
	
	$(document).bind("SpoolCacheRefreshing", function() {
		updateStatus("Updating cache");
	});
		
	$(document).bind('SpoolCacheUpdated', function(e, paths) {
		updateStatus("Cache updated with "+paths.length+" new resources");
		updateResourceList(paths);
	});

	$(document).bind("SpoolResourceSaved", function(e, paths) { // assuming this is only called with one resource, which it is at the moment
		updateStatus("Saved "+paths[0]+" to cache");
		updateUnsyncedList(paths);
	});
	
	$(document).bind("SpoolResourceSynced", function(e, paths) { // assuming this is only called with one resource, which it is at the moment
		updateStatus("Synced "+paths[0]+" to the web");
		updateUnsyncedList(paths, true);
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

	$('button').click(function(e) {
		e.preventDefault();
		$.ajax({
			url: $(this).data('href'),
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
					data: JSON.stringify(tiddler)
				};
				list.push(item);
			});
			return list;
		}
	});

});