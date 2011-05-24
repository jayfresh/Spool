$(document).ready(function() {
	
	module("interface", {
		setup: function() {},
		teardown: function() {}
	});
	
	test("given a POST, it should not intercept this call", function() {
		
	});
	
	test("given a PUT, it should intercept this call", function() {
		
	});
	
	test("given a DELETE, it should intercept this call", function() {
		
	});
	
	test("given a GET, it should intercept this call", function() {
		
	});
	
	test("given a PUT, it should always return 204", function() {
		
	});
	
	test("given a DELETE, it should always return ???", function() {
		
	});
	
	test("given a GET for a resource that is not present in storage, it should return a 404", function() {
		
	});
	
	test("given a GET for a resource that is present in storage, it should return a 200 and the resource", function() {
		
	});

	module("syncer", {
		setup: function() {},
		teardown: function() {}
	});
	
	test("given a sync instruction, it should pull a set of resources from the remote server", function() {
		
	});
	
	test("given a successful pull of resources, it should merge any resources that are different", function() {
		
	});
	
	test("given a function to use for merging, it should use that for merging", function() {
		
	});
	
	test("given an unsuccessful merge, it should create a conflicted resource containing the local content", function() {
		
	});
	
	test("given a successful merge, it should save the merged resource to storage", function() {
		
	});
	
	test("given a completed pull, it should push any unsynced resources to the remote server", function() {
		
	});
	
	// Note: it is expected conflicted resources will be manually deleted
	test("it should not attempt to sync conflicted resources", function() {
		
	});
	
	test("given a successful push, it should remove synced resources from the unsynced pile", function() {
		
	});
	
	test("given a web fail, it should fail the sync", function() {
		
	});

	module("storage", {
		setup: function() {},
		teardown: function() {}
	});
	
	/* design points:
	- it should only deal in objects, not stringified objects
	- it should be dumb, not knowing or caring about whether resources are conflicted, synced or otherwise
	*/
	
	test("it should call the SpoolResourceLoaded event when a resource is read from storage", function() {
		
	});

	test("it should call the SpoolResourceSaved event when a resource is written to storage", function() {
		
	});

});