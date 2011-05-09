/*
SPOOL
v0.2

Author: Jonathan Lister (jonathan [at] withjandj [dot] com)
License: MIT (http://www.opensource.org/licenses/mit-license.php)

Requires:
- jQuery - jquery.com (written with 1.4.1)
- json2.js - https://github.com/douglascrockford/JSON-js

TO-DO:
- add syncFailed event

*/

var $ = jQuery;

function Spool(config) {
	var _ajax = $.ajax,
		that = this,
		fallbackStorage = {
			/*
				in-memory implementation of localStorage for browsers that don't support localStorage
				not ideal, as length is a function instead of a property - is there something I can do with getters to fix this?
				- actually, I can sort this by using getItem and setItem instead of square-bracket syntax
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
				save: function(path, data, synced) {
					// TO-DO: handle exception when storage is exceeded
					console.log('saving data',data);
					var item = {
						data: data,
						meta: {
							unsynced: synced ? false : true
						}
					};
					storage.storage[path] = JSON.stringify(item);
				},
				get: function(path) {
					var item = storage.getRawItem(path),
						data;
					if(item) {
						data = item.data;
						return data || "";
					}
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
				},
				getRawItem: function(path) {
					var item = storage.storage[path];
					if(item) {
						return JSON.parse(item);
					}
				},
				isUnsynced: function(path) {
					var item = storage.getRawItem(path);
					if(item) {
						return item.meta.unsynced;
					}
				},
				markSynced: function(path) {
					var item = storage.getRawItem(path);
					if(item) {
						item.meta.unsynced = false;
						storage.storage[path] = JSON.stringify(item);
					}
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
			if(typeof handler==="function") {
				parseList = handler;
			}
		},
		isNewer = function(local, remote) { // can be overridden when init'ing
			return false; // assume remote is newer by default
		},
		setIsNewer = function(handler) {
			if(typeof handler==="function") {
				isNewer = handler;
			}
		}
		compareContent = function(local, remote) { // can be overridden when init'ing
			if(Spool.objCompare(local,remote)) {
				return true;
			} else {
				return false;
			}
		},
		setCompareContent = function(handler) {
			if(typeof handler==="function") {
				compareContent = handler;
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
		// TO-DO: if, after a full listing of resources from the server, there are local resources not in that list, check if they are unsynced - if they are, they need syncing; if not, something has gone wrong, throw an error
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
						localData = storage.get(path),
						localPath;
						if(!localData) {
							console.log('could not find local for '+path);
							paths.push(path);
							storage.save(path,data,true);
						} else {
							if(isNewer(localData,data)) {
								// if the local content is different, that means it hasn't synced
								// check that this local resource is unsynced; if it isn't, throw an error since it should be; if it is, prompt a sync?
								if(storage.isUnsynced(path)) {
									// ok, do nothing
									// TO-DO: or should I prompt a sync?
								} else {
									throw new Error("local resource is newer than remote resource, but is not unsynced - something has gone wrong",path);
								}
							} else {
								// if the local content is the same, replace with newer remote resource
								// if not, check if it is synced - if it is, it is safe to overwrite; if not, create a local conflicted copy (as does DropBox)
								// TO-DO: what do I do with the new resource? sync it?
								if(compareContent(localData,data)) {
									paths.push(path);
									storage.save(path,data);
								} else {
									if(storage.isUnsynced(path)) {
										localPath = path+" (conflicted copy "+new Date()+")";
										paths.push(localPath);
										storage.save(localPath,localData);
									}									
									paths.push(path);
									storage.save(path,data);
								}
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
			$(document).trigger(that.savedResourceEvent, [[path], options]);
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
	if(config.isNewer) {
		setIsNewer(config.isNewer);
	}
	if(config.compareContent) {
		setCompareContent(config.compareContent);
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
	
	$(document).bind(that.savedResourceEvent, function(e, paths, options) {
		var syncFail = function() {
			console.log('failed to sync on save', arguments);
		};
		$.each(paths, function(i, path) {
			console.log('syncing '+path);
			$.extend(options, {
				url: path,
				type: 'put',
				contentType: 'application/json',
				success: function(data, status, xhr) {
					var statuses = [204];
					if(xhr && $.inArray(xhr.status, statuses)!==-1) {
						console.log('successful sync',arguments);
						$(document).trigger(that.syncedResourceEvent, [[path]]);
					} else {
						syncFail.apply(this,arguments);
					}
				},
				error: function() {
					syncFail.apply(this,arguments);
				}
			});
			_ajax(options);
		});
	});
	
	$(document).bind(that.syncedResourceEvent, function(e, paths) {
		$.each(paths, function(i, path) {
			storage.markSynced(path);
		});
	});

	// load the local cache and then refresh
	that.loadCache(that.updateCache);
}

Spool.objCompare = function(obj1, obj2) {
	var equal = true;
	if(typeof obj1==="object") {			
		$.each(obj1, function(key, value) {
			if(!obj2[key] || obj2[key]!==value) {
				equal = false;
				return false;
			}
		});
	} else if(obj1!==obj2) {
		equal = false;
	}
	return equal;
};

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