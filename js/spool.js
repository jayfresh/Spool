/*
Author: Jonathan Lister (jonathan [at] withjandj [dot] com)
License: MIT (http://www.opensource.org/licenses/mit-license.php)

Requires:
- jQuery - jquery.com (written with 1.4.1)
- json2.js - https://github.com/douglascrockford/JSON-js

*/

var $ = jQuery;

function supports_html5_storage() {
	try { // to catch bug in older version of Firefox with cookies turned off
		if('localStorage' in window && window['localStorage'] !== null) {
			return true;
		}
	} catch (e) {
		return false;
	}
}

function Spool(config) {
	var _ajax = $.ajax,
		that = this,
		fallbackStorage = { // in-memory implementation of localStorage for browsers that don't support localStorage
			key: function(i) {
				$.each(this, function(j, item) {
					if(i===j) {
						return item;
					}
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
					return JSON.parse(data);
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
	that.updateCache = function() {
		// TO-DO: work out how to accommodate requests for changes to the server data since a certain point (which might be specific to each implementation, but a sensible default could use something like eTags or cookies - perhaps it's a capability that could be determined by inspecting a server response
		console.log('updating cache at '+serverListPath);
		var list;
		if(serverListPath) {
			_ajax({
				url: localMode && serverPath ? serverPath + serverListPath : serverListPath,
				dataType: 'json',
				success: function(data) {
					list = parseList(data);
					console.log(storage);
					$.each(list, function(i, item) {
						if(!storage.get(item.path)) {
							console.log('saving to '+item.path,item.data);
							storage.save(item.path,item.data);
						} else {
							// for now, don't override
							// TO-DO: see if the items are the same; if not, do something appropriate
						}
					});
				}
			});
		}
	};
	window.storage = storage; // JRL: debug
	$.ajax = function(options) {
		var url = options.url,
			path = getPath(url),
			data = storage.get(path);
		if(data) {
			return window.setTimeout(function() {
				options.success(data); // TO-DO: should I be providing the rest of the arguments here?
			}, 0);
		} else {
			return window.setTimeout(function() {
				if(options.error) {
					options.error(null, "error", "Not Found"); // TO-DO: perhaps something different here?
				}
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
	// we should update the cache if possible
	that.updateCache();
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