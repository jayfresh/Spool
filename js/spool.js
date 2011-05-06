/*
SPOOL
v0.2

Author: Jonathan Lister (jonathan [at] withjandj [dot] com)
License: MIT (http://www.opensource.org/licenses/mit-license.php)

Requires:
- jQuery - jquery.com (written with 1.4.1)
- json2.js - https://github.com/douglascrockford/JSON-js

*/

var $ = jQuery;

function Spool(config) {
	var _ajax = $.ajax,
		that = this,
		fallbackStorage = {
			/*
				in-memory implementation of localStorage for browsers that don't support localStorage
				not ideal, as length is a function instead of a property - is there something I can do with getters to fix this?
			*/
			key: function(i) { // this function assumes that running over an object's property list returns them in the same order they were set - TO-DO: verify whether this is true
				var count = 0;
				$.each(this, function(j, item) {
					if(i===count) {
						return j;
					}
					i++;
				});
			},
			length: function() {
				var l = 0;
				$.each(this, function(i) {
					if(typeof that[i] !== "function") {
						l++;
					}
				});
				return l;
			}
		},
		getStorage = function() {
			var storage = {
				save: function(path, item) {
					storage.storage[path] = item;
				},
				get: function(path) {
					var data = storage.storage[path];
					return data ? JSON.parse(data) : "";
				},
				list: function() {
					var l = storage.storage.length,
						i = 0,
						items = [];
					if(typeof l === "function") {
						l = l();
					}
					for(i; i<l; i++) {
						items.push(storage.storage.key(i));
					}
					return items;
				}
			};
			if(supports_html5_storage) {
				storage.storage = localStorage;
			} else {
				storage.storage = fallbackStorage;
			}
			return storage;
		},
		storage = getStorage(),
		getPath = function(url) {
			return parseUri(url).relative;
		},
		serverPath,
		serverListPath,
		setServerListPath = function(url) {
			var path = getPath(url);
			serverListPath = path;
		},
		parseList = function(data) {
			return data; // when init'ing, override this with implementation-specific mapping function
		},
		setParseList = function(handler) {
			if(handler) {
				parseList = handler;
			}
		},
		localMode = false;
	that.loadCache = function(callback) {
		var paths = storage.list();
		$(document).trigger(that.loadedCacheEvent, [paths]);
		if(typeof callback==="function") {
			callback();
		}
	};
	that.updateCache = function() {
		// TO-DO: work out how to accommodate requests for changes to the server data since a certain point (which might be specific to each implementation, but a sensible default could use something like eTags or cookies - perhaps it's a capability that could be determined by inspecting a server response
		if(serverListPath) {
			$(document).trigger(that.refreshingCacheEvent);
			_ajax({
				url: localMode && serverPath ? serverPath + serverListPath : serverListPath,
				dataType: 'json',
				success: function(data) {
					var list = parseList(data),
						localPath,
						localData,
						path,
						data,
						paths = [];
					$.each(list, function(i, item) {
						path = item.path;
						data = item.data;
						localData = storage.get(path);
						if(!localData) {
							paths.push(path);
							storage.save(path,data);
						} else {
							localData = JSON.stringify(localData);
							if(data!==localData) {
								// create a conflicted copy of local item - a la DropBox
								localPath = path+" (conflicted copy "+new Date()+")";
								paths.push(localPath);
								storage.save(localPath,localData); // TO-DO: a new resource! This must sync! Or not?? What does DropBox do?
								paths.push(path);
								storage.save(path,data);
							} else {
								// "don't do anything"
							}
							
						}
					});
					$(document).trigger(that.updatedCacheEvent, [paths]);
				}
			});
		}
	};
	that.loadedCacheEvent = "SpoolCacheLoaded";
	that.refreshingCacheEvent = "SpoolCacheRefreshing";
	that.updatedCacheEvent = "SpoolCacheUpdated";
	that.savedResourceEvent = "SpoolResourceSaved";
	that.syncedResourceEvent = "SpoolResourceSynced";
	window.storage = storage; // JRL: debug
	$.ajax = function(options) {
		var url = options.url,
			type = options.type ? options.type.toLowerCase() : "get",
			path = getPath(url),
			data = storage.get(path);
		if(type==="get") {
			if(data) {
				return window.setTimeout(function() {
					options.success(data); // TO-DO: should I be providing the rest of the arguments here?
					// TO-DO: this is probably where I should notify the bit that speaks to the internet, so it can check for updates
				}, 0);
			} else {
				return window.setTimeout(function() {
					if(options.error) {
						options.error(null, "error", "Not Found"); // TO-DO: perhaps something different here?
						// TO-DO: this is probably where I should notify the bit that speaks to the internet, so it can go look for the resource
					}
				}, 0);
			}
		} else { // assume PUT for now, since it is unlikely to return something - right??
			storage.save(path, options.data || "");
			$(document).trigger(that.savedResourceEvent, [[path]]);
			return window.setTimeout(function() {
				options.success();
			}, 0);
		}
	};
	// we need to setServerListPath
	if(config.serverListPath) {
		setServerListPath(config.serverListPath);
	}
	// we should set the parseList function to something appropriate to this implementation
	if(config.parseList) {
		setParseList(config.parseList);
	}
	// enable cross-domain AJAX if we're on a file URI (Mozilla only)
	if(window.location.protocol.indexOf('file')!==-1) {
		localMode = true;
		if(config.serverPath) {
			serverPath = config.serverPath;
		}
		that._ajax = _ajax;
		_ajax = function() {
			if(window.Components && window.netscape && window.netscape.security) {
				window.netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
			}
			that._ajax.apply(that, arguments);
		};
	}
	
	$(document).bind(that.savedResourceEvent, function(e, paths) {
		$.each(paths, function(i, path) {
			// TO-DO: need to support any options passed along, particularly processData, as it's not working without that
			_ajax({
				url: path,
				type: 'put',
				contentType: 'application/json',
				data: storage.get(path),
				success: function() {
					$(document).trigger(that.syncedResourceEvent, [[path]]);
				},
				error: function() {
					// TO-DO: figure out what to do if save is failed
					console.log('failed to sync on save', arguments);
				}
			});
		});
	});

	// load the local cache and then refresh
	that.loadCache(that.updateCache);
}

function supports_html5_storage() {
	try { // to catch bug in older version of Firefox with cookies turned off
		if('localStorage' in window && window['localStorage'] !== null) {
			return true;
		}
	} catch (e) {
		return false;
	}
}

// parseUri 1.2.2
// (c) Steven Levithan <stevenlevithan.com>
// MIT License

function parseUri(str) {
	var	o   = parseUri.options,
		m   = o.parser[o.strictMode ? "strict" : "loose"].exec(str),
		uri = {},
		i   = 14;

	while (i--) uri[o.key[i]] = m[i] || "";

	uri[o.q.name] = {};
	uri[o.key[12]].replace(o.q.parser, function ($0, $1, $2) {
		if ($1) uri[o.q.name][$1] = $2;
	});

	return uri;
}

parseUri.options = {
	strictMode: false,
	key: ["source","protocol","authority","userInfo","user","password","host","port","relative","path","directory","file","query","anchor"],
	q:   {
		name:   "queryKey",
		parser: /(?:^|&)([^&=]*)=?([^&]*)/g
	},
	parser: {
		strict: /^(?:([^:\/?#]+):)?(?:\/\/((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?))?((((?:[^?#\/]*\/)*)([^?#]*))(?:\?([^#]*))?(?:#(.*))?)/,
		loose:  /^(?:(?![^:@]+:[^:@\/]*@)([^:\/?#.]+):)?(?:\/\/)?((?:(([^:@]*)(?::([^:@]*))?)?@)?([^:\/?#]*)(?::(\d*))?)(((\/(?:[^?#](?![^?#\/]*\.[^?#\/.]+(?:[?#]|$)))*\/?)?([^?#\/]*))(?:\?([^#]*))?(?:#(.*))?)/
	}
};

parseUri.options.strictMode = true;


// json-sans-eval - http://code.google.com/p/json-sans-eval/
// author: http://code.google.com/u/mikesamuel/
// licence: Apache 2.0 - http://www.apache.org/licenses/LICENSE-2.0

window.jsonParse=function(){var r="(?:-?\\b(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?\\b)",k='(?:[^\\0-\\x08\\x0a-\\x1f"\\\\]|\\\\(?:["/\\\\bfnrt]|u[0-9A-Fa-f]{4}))';k='(?:"'+k+'*")';var s=new RegExp("(?:false|true|null|[\\{\\}\\[\\]]|"+r+"|"+k+")","g"),t=new RegExp("\\\\(?:([^u])|u(.{4}))","g"),u={'"':'"',"/":"/","\\":"\\",b:"\u0008",f:"\u000c",n:"\n",r:"\r",t:"\t"};function v(h,j,e){return j?u[j]:String.fromCharCode(parseInt(e,16))}var w=new String(""),x=Object.hasOwnProperty;return function(h,
j){h=h.match(s);var e,c=h[0],l=false;if("{"===c)e={};else if("["===c)e=[];else{e=[];l=true}for(var b,d=[e],m=1-l,y=h.length;m<y;++m){c=h[m];var a;switch(c.charCodeAt(0)){default:a=d[0];a[b||a.length]=+c;b=void 0;break;case 34:c=c.substring(1,c.length-1);if(c.indexOf("\\")!==-1)c=c.replace(t,v);a=d[0];if(!b)if(a instanceof Array)b=a.length;else{b=c||w;break}a[b]=c;b=void 0;break;case 91:a=d[0];d.unshift(a[b||a.length]=[]);b=void 0;break;case 93:d.shift();break;case 102:a=d[0];a[b||a.length]=false;
b=void 0;break;case 110:a=d[0];a[b||a.length]=null;b=void 0;break;case 116:a=d[0];a[b||a.length]=true;b=void 0;break;case 123:a=d[0];d.unshift(a[b||a.length]={});b=void 0;break;case 125:d.shift();break}}if(l){if(d.length!==1)throw new Error;e=e[0]}else if(d.length)throw new Error;if(j){var p=function(n,o){var f=n[o];if(f&&typeof f==="object"){var i=null;for(var g in f)if(x.call(f,g)&&f!==n){var q=p(f,g);if(q!==void 0)f[g]=q;else{i||(i=[]);i.push(g)}}if(i)for(g=i.length;--g>=0;)delete f[i[g]]}return j.call(n,
o,f)};e=p({"":e},"")}return e}}();