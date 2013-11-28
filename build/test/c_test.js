;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Collection = function Collection(conf) {
  var self = this;
  var routes = {};

  var normalizePath = function(path) {
    path = path.replace(new RegExp("[/ ]+$", "g"), ""); //end
    path = path.replace(new RegExp("^[/ ]+", "g"), ""); //beginning
    return path;
  };

  /**
   * Build the collection using hte profided configuration has
   *
   * @method build()
   * @param  {object} conf the configuration
   * @return {Collection} itself
   * @chainable
   */
  self.build = function build(conf) {
    Object.keys(conf).forEach(function(name){
      self.add(name, conf[name]);
    });

    return self;
  };

  /**
   * Adds a route collection at the end of the current set by appending all
   * routes of the added collection.
   *
   * @method addCollection()
   * @param {Collection} coll the other collection
   * @return {Collection} itself
   * @chainable
   */
  self.addCollection = function addCollection(coll) {

    //remove identical first so they get added to the end
    var insert = coll.all();
    Object.keys(insert).forEach(function(name){
      if(self.has(name))
        self.remove(name);

      self.add(name, insert[name]);
    });

    return self;
  };

  /**
   * Add an prefix to all routes in the collection
   * 
   * @param {string} prefix the string to prefix with
   */
  self.addPrefix = function addPrefix(prefix) {

    //remove slashes and spaces
    prefix = normalizePath(prefix);

    Object.keys(routes).forEach(function(name){
      routes[name].path = '/'+prefix+routes[name].path;
    });

    return self;
  };

  /**
   * Add a route to the collection
   *
   * @method add()
   * @param {string} name  the route name
   * @param {Route} route the route conf
   * @return {Collection} itself
   * @chainable
   */
  self.add = function add(name, route) {

    if(route.path === undefined)
      throw new Error('given route "'+name+'" did not specify a path, received:' + route);

    route.path = '/' + normalizePath(route.path);

    if(route.defaults !== undefined && typeof route.defaults !== 'object' )
      throw new Error('given route "'+name+'" expected an object to specify defaults, received:' + route.defaults);

    routes[name] = route;
    return self;
  };

  /**
   * Remove a route from the collection
   *
   * @method remove()
   * @param {string} name  the route name
   */
  self.remove = function remove(name) {
    delete routes[name];
  };

  /**
   * Get a route from the collection by name
   *
   * @method get()
   * @param  {string} name the route name
   * @return {Route}  the specific route or undefined if it doesnt exist
   */
  self.get = function get(name) {
    return routes[name];
  };

  /**
   * Does the collection has the specifc route
   *
   * @method has()
   * @param  {string}  name the name
   * @return {Boolean}      wether it exists
   */
  self.has = function has(name) {
    var res = self.get(name);
    return ((res === undefined) ? false : true);
  };

  /**
   * Return all routes in the collection
   *
   * @method all()
   * @return {Object} the route collection has
   */
  self.all = function all() {
    return routes;
  };

  //construction
  if(conf !== undefined)
    self.build(conf);

};

module.exports = Collection;
},{}],2:[function(require,module,exports){
var Collection = require('../src/collection.js');
var userRoutes = require('./examples/user_routes.json');
var invalidRoutes = require('./examples/invalid_routes.json');

describe('Collection', function(){

  var c;
  beforeEach(function(){
    c = new Collection();
  });

  it("Should be able to add/remove/has/all route", function(){

    var r = userRoutes.index;

    var r2 = c.add('test', userRoutes.one);
    r2.should.equal(c);
    Object.keys(c.all()).length.should.equal(1);
    c.has('test').should.equal(true);

    c.add('test', r);
    Object.keys(c.all()).length.should.equal(1);
    c.get('test').should.equal(r);
    c.remove('test');
    c.has('test').should.equal(false);
    
  });

  it("Should build using config", function(){

    var c2 = new Collection(userRoutes);

    c2.has('index').should.equal(true);
    c2.has('one').should.equal(true);
    c2.get('index').path.should.equal('/users');

  });

  it("should throw on invalid", function(){

    (function(){
      c.add('invalid1', invalidRoutes.invalid1);  
    }).should.throw();
    
    (function(){
      c.add('invalid2', invalidRoutes.invalid2);  
    }).should.throw();

  });

  it("Add collection", function(){

    c.add('index', {path: '/index'});
    c.add('remind', {path: '/remind'});

    var r = c.addCollection(new Collection(userRoutes));

    var res = c.all();
    var keys = Object.keys(res);

    r.should.equal(c);
    keys[0].should.not.equal('index');
    keys[0].should.equal('remind');
    keys[1].should.equal('index');
    keys[2].should.equal('one');

  });

  it("Add prefix", function(){

    var r = c.build(userRoutes);
    r.should.equal(c);

    r.addPrefix(' /api/u/ ');
    r.get('index').path.should.equal('/api/u/users');

  });

});

},{"../src/collection.js":1,"./examples/invalid_routes.json":3,"./examples/user_routes.json":4}],3:[function(require,module,exports){
module.exports={
	"invalid1": {

	},
	"invalid2": {
		"path": "/invalid-default",
		"defaults": "a"

	}

}
},{}],4:[function(require,module,exports){
module.exports={
	"index": {
		"path": " users "
	},
	"one": {
		"path": "/users/{id}"
	},
	"profile": {
		"path": "/users/{id}",
		"defaults": {"_controller": "profile"}
	}
}
},{}]},{},[2])
;