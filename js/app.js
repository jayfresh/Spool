/*
	requires: json2.js - https://github.com/douglascrockford/JSON-js
*/

$(document).ready(function() {

	var serverPath = "http://tiddlyweb.peermore.com/wiki",
		bagPath = "/bags/docs",
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
});