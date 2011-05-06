/*
SPOOL
v0.1


*/
var Spool = {
	root: ""
};

function setRoot(url) {
	if(url.lastIndexOf("/")!==url.length-1) {
		url = url + "/";
	}
	Spool.root = url;
}

function supports_html5_storage() {
	try {
		return 'localStorage' in window && window['localStorage'] !== null;
	} catch (e) {
		return false;
	}
}

function listLocal() {
	var l = localStorage.length,
		i,
		out = [];
	for(i=0; i<l; i++) {
		out.push(localStorage.key(i));
	}
	return out;
}

function listRemote() {

}

function save(key, value) {
	localStorage.key = value;
	queueSave(key, value);
}

function get(key) {
	var val = localStorage.key;
	if(val) {
		queueGet(key);
		return val;
	}
}

function queueSave(key, value) {
	_ajax.call(jQuery, {
		url: Spool.root+path,
		success: function(data) {
			// TO-DO: figure out what to do here...
		},
		error: function() {
			// TO-DO: this is probably the place where we'd want to line up another go at sync'ing
		}
	});
}

function queueGet(path) {
	// TO-DO: check if online; if not, bind to coming back online event; or poll?
	// navigator.onLine, or setting something after we've failed an XHR
	_ajax.call(jQuery, {
		url: Spool.root+path,
		success: function(data) {
			localStorage[path] = data; // TO-DO: this should probably fire an event or something, so an app with a failed get can use this new value
		}
	});
}

var _ajax = jQuery.ajax;
jQuery.ajax = function(options) {
	var url = options.url,
		path = getPath(url),
		val,
		data = options.data || {};
	if(!options.type || options.type==="get") {
		val = get(path);
		if(val) {
			return val;
		} else {
			throw new Error("value not in cache, attempting to retrieve");
		}
	} else { // assume 'post'
		val = save(path, data);
	}
};