/*
	requires: json2.js - https://github.com/douglascrockford/JSON-js
*/

$(document).ready(function() {

	var serverPath = "http://tiddlyweb.peermore.com/wiki",
		bagPath = "/bags/docs",
		spool,
		$statusBar = $('#statusBar'),
		updateStatus = function(message) {
			$statusBar.text(message);
		};
	$(document).bind("SpoolCacheRefresh", function() {
		updateStatus("Updating cache");
	});
		
	$(document).bind('SpoolCacheUpdated', function(e, paths) {
		updateStatus("Cache updated with "+paths.length+" resources");
		var listItems = [],
			pathLabel,
			stemLength = bagPath.length+1;
		$.each(paths, function(i, path) {
			pathLabel = path.substring(stemLength);
			listItems.push('<li><a href="'+path+'">'+decodeURIComponent(pathLabel)+'</a></li>');
		});
		$('#resourceList').html(listItems.join("\n"));
	});

	$('a').live('click', function(e) {
		e.preventDefault();
		$.ajax({
			url: $(this).attr('href'),
			success: function(data) {
				console.log('loaded', data);
			}
		});
		return false;
	});

	$('button').click(function(e) {
		e.preventDefault();
		$.ajax({
			url: $('input[type=text]').val(),
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
	serverListPath: bagPath+"/tiddlers.json?fat=1",
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
				path: bagPath+"/"+encodeURIComponent(tiddler.title),
				data: JSON.stringify(tiddler)
			};
			list.push(item);
		});
		return list;
	}
});

});