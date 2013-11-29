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
var Signal = function Signal(collection) {
  var self = this;

  var SEPARATORS = '/,;.:-_~+*=@|';

  /**
   * The route collection we use for matching and generation
   * @type {Collection}
   */
  self.collection = collection;

  /**
   * Match an url to an route
   *
   * @method match()
   * @param  {string} url the url to match
   * @return {Object} the route attributes
   */
  self.match = function(url) {
    var routes = self.collection.all();
    var matched = false;
    var attributes = {};

    Object.keys(routes).forEach(function(name){
      if(matched === true)
        return;

      var route = routes[name];
      var compiled = self.compile(route);

      //first try a less expensive method for testing
      if ('' !== compiled.staticPrefix && url.indexOf(compiled.staticPrefix) !== 0) {
        return;
      }

      var match = url.match(compiled.regexp);
      if(match === null)
        return;

      //get values from url
      Object.keys(compiled.variables).forEach(function(name){
        var val = match[compiled.variables[name]];
        if(val) {
          attributes[name] = val;
        }        
      });

      //add defaults
      if(route.defaults !== undefined) {
        Object.keys(route.defaults).forEach(function(def){
          if(!(def in attributes))
            attributes[def] = route.defaults[def];
        });        
      }

      attributes._route = name;
      matched = true;
    });

    if(matched === false)
      throw new Error('No route was found that matches the url "'+url+'"');
    return attributes;
  };

  /**
   * Generate an url based on the name of the route
   *
   * @method generate()
   * @param  {string} name       The route name
   * @param  {object} parameters route parameters
   * @return {string}            the url
   */
  self.generate = function(name, parameters) {

    if(self.collection.has(name) === false)
      throw new Error('Route with name "'+name+'" does not exist.');

    var route = self.collection.get(name);
    if(route.defaults !== undefined) {
      Object.keys(route.defaults).forEach(function(def){
        if(!(def in parameters))
          parameters[def] = route.defaults[def];
      });        
    }

    var compiled = self.compile(route);
    Object.keys(compiled.variables).forEach(function(key){
      if(parameters[key] === undefined)
        throw new Error('Some mandatory parameters are missing ("'+key+'") to generate a URL for route "'+name+'"');
    });

    var url = '';
    var optional = true;
    var defaults = (route.defaults === undefined) ? ({}) : (route.defaults);
    var tokens = compiled.tokens.reverse();
    tokens.forEach(function(token){
      if ('variable' === token[0]) {
        if (!optional || !(token[3] in defaults) || undefined !== parameters[token[3]] && parameters[token[3]] !== defaults[token[3]]) {

          if(!new RegExp('^'+token[2]+'$').test(parameters[token[3]])) {
            throw new Error('Parameter "'+token[3]+'" for route "'+name+'" must match "'+token[2]+'" ("'+parameters[token[3]]+'" given) to generate a corresponding URL.');
          }

          url = token[1] + parameters[token[3]] + url;
          optional = false;

        }
      } else {
        // static text
        url = token[1] + url;
        optional = false;
      }

    });


    return url;
  };


  /**
   * Compiles an route into regexp
   * NOTE: this is ported directly from Symfony2 routing framework's compile
   *
   * @method compile()
   * @param  {object} route the route
   * @return {object} compiled route
   */
  self.compile = function(route) {

    var tokens = [];
    var variables = {};
    var pattern = route.path;
    var defaultSeparator = '/';
    var pos = 0;

    //@todo: refactor
    var quoteRegexp = function(str) {
        return (str+'').replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1");
    };

    //@todo: refactor out of compile
    var hasDefault = function(key) {
      if(route.defaults === undefined)
        return false;

      var res = route.defaults[key];
      if(res === undefined)
        return false;

      return true;
    };

    var matches = pattern.match(/\{\w+\}/g);
    if(matches !== null) {
      matches.forEach(function(match, i){
        var varName = match.substring(1, match.length-1);

        var precedingText = pattern.substring(pos, pattern.indexOf(match));
        pos = pattern.indexOf(match) + match.length;

        var precedingChar = (precedingText.length > 0) ? precedingText.substring(precedingText.length-1, precedingText.length) : '';
        var isSeparator = (SEPARATORS.indexOf(precedingChar) > -1) ? (true) : (false);

        if(isSeparator && precedingText.length > 1) {
          tokens.push(['text', precedingText.substring(0, precedingText.length-1)]);
        } else if(!isSeparator && precedingText.length > 0) {
          tokens.push(['text', precedingText]);
        }

        var regexp = ("requirements" in route) ? (route.requirements[varName]) : undefined;
        if(regexp === undefined) {
          var followingPattern = pattern.substring(pos);
          var nextSeparator = followingPattern.replace(/\{\w+\}/g, ''); 
          nextSeparator = (SEPARATORS.indexOf(nextSeparator[0]) > -1) ? (nextSeparator[0]) : '';
          nextSeparator = (defaultSeparator !== nextSeparator && '' !== nextSeparator) ? (quoteRegexp(nextSeparator)) : ('');

          regexp = '[^'+quoteRegexp(defaultSeparator)+nextSeparator+']+';

        }

        tokens.push(['variable', (isSeparator) ? (precedingChar) : (''), regexp, varName]);
        variables[varName] = i+1;

      });
    }

    if(pos < pattern.length) {
      tokens.push(['text', pattern.substring(pos)]);
    }

    var firstOptionalPos = 9007199254740992;
    for (var i=0;i<tokens.length;i++)
    { 
      if(tokens[i][0] === 'variable' && hasDefault(tokens[i][3])) {
        firstOptionalPos = i;
        break;

      }
    }

    var openOptional = 0;
    var computeRegexp = function(tokens, index, firstOptional) {
      var token = tokens[index];

      if(token[0] === 'text') {
        return quoteRegexp(token[1]);
      } else {
        //token === variable
        if(index === 0 && firstOptional === 0) {
          return  quoteRegexp(token[1])+'('+token[2]+')?';
        } else {
          var regexp = quoteRegexp(token[1])+'('+token[2]+')';
          if (index >= firstOptional) {
            // open optional part
            // adding an extra optional shifts the match position
            regexp = "(" + regexp; 
            variables[token[3]] = variables[token[3]] + 1; 
            openOptional++;
            var nbTokens = tokens.length;
            if(index === nbTokens - 1) {
              regexp = regexp + Array(openOptional+1).join(')?');
            }
          }
          return regexp;
        }
      }

    };

    var regexp = '';
    tokens.forEach(function(token, i){
      regexp = regexp + computeRegexp(tokens, i, firstOptionalPos);
    });

    return {
      staticPrefix: (tokens[0][0] === 'text') ? (tokens[0][1]) : (''),
      regexp: new RegExp('^'+regexp+'$'),
      tokens: tokens,
      variables: variables
    };
  };

};

module.exports = Signal;
},{}],3:[function(require,module,exports){
module.exports={

	"basic": {
		"path": "/basic/{type}/id-{id}.{_format}test",
		"requirements": {
			"id": "[0-9]"
		}
	},

	"slogan": {
		"path": "{type}/user/{name}/{slogan}",
        "defaults": {
          "name": "ad",
          "slogan": "bier"
        }
	},

	"onevar": {
		"path": "/{dog}",
		"defaults": {
			"dog": "golden",
			"_controller": "test"
		}
	},

	"house": {
		"path": "/house/car{type}/user/{owner}",
		"defaults": {
			"owner": "ad"
		}
	},

	"api": {
		"path": "/api/car{type}/user/{username}/owns/{car}",
		"defaults": {
			"username": "advanderveer",
			"car": "bmw"
		}
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
},{}],5:[function(require,module,exports){
var Signal = require('../src/signal.js');
var Collection = require('../src/collection.js');
var userRoutes = require('./examples/user_routes.json');
var matchRoutes = require('./examples/match_routes.json');

describe('Signal', function(){

  var c, s;
  beforeEach(function(){
    c = new Collection(userRoutes);
    s = new Signal(c);

  });

  it("construction", function(){
    s.collection.should.equal(c);
  });


  describe('Compiling routes', function(){

    it("compile without vars", function(){

      var compiled = s.compile({path:'/'});
      compiled.staticPrefix.should.equal('/');

    });

    it("basic", function(){

      var compiled1 = s.compile({path:'/api/{type}/id-{id}.{_format}test'});
      Object.keys(compiled1.variables).length.should.equal(3);
      compiled1.variables.type.should.equal(1);
      compiled1.variables.id.should.equal(2);
      compiled1.variables._format.should.equal(3);
      compiled1.staticPrefix.should.equal('/api');

      var res1 = '/api/car/id-1.xmltest'.match(compiled1.regexp);
      res1[1].should.equal('car');
      res1[2].should.equal('1');
      res1[3].should.equal('xml');

    });

    it("requirement mis match", function(){

      var compiled1 = s.compile({
        path:'/api/car{type}.xml',
        requirements: {
          type: '[0-9]'
        }
      });
      var res1 = '/api/carford.xml'.match(compiled1.regexp);
      if(res1 !== null)
        throw Error('fail');

      res1 = '/api/car1.xml'.match(compiled1.regexp);
      res1[1].should.equal('1');

    });

    it("requirement and extra var", function(){

      var compiled1 = s.compile({
        path:'/api/car{type}/user/{name}',
        requirements: {
          type: '[0-9]'
        }
      });
      var res1 = '/api/carford/user/ad'.match(compiled1.regexp);
      if(res1 !== null)
        throw Error('fail');

      res1 = '/api/car1/user/ad'.match(compiled1.regexp);
      res1[1].should.equal('1');
      res1[2].should.equal('ad');

    });

    it("only one default", function(){

      var compiled1 = s.compile({
        path:'/{type}',
        defaults: {
          type: 5
        }
      });

      var res1 = '/'.match(compiled1.regexp);
      if(res1[1] !== undefined)
        throw Error('fail');

    });

    it("multiple vars, default at end", function(){

      var compiled1 = s.compile({
        path:'/api/car{type}/user/{name}',
        defaults: {
          name: 'ad'
        }
      });

      var res1 = '/api/carA/user'.match(compiled1.regexp);
      res1[1].should.equal('A');

    });

    it("multiple defaults", function(){

      var compiled1 = s.compile({
        path:'{type}/user/{name}/{slogan}',
        defaults: {
          name: 'ad',
          slogan: 'bier'
        }
      });

      var res1 = 'carA/user'.match(compiled1.regexp);
      res1.should.not.equal(null);

      var compiled2 = s.compile({
        path:'/api/car{type}/user/{name}/says/{slogan}',
        defaults: {
          name: 'ad',
          slogan: 'bier'
        }
      });

      var res2 = '/api/carA/user'.match(compiled2.regexp);
      res2.should.not.equal(null);
      var res3 = '/api/carA/user/ad/says'.match(compiled2.regexp);
      res3.should.not.equal(null);

    });

  });


  describe('Match/Generate routes', function(){

    var r, r2;
    beforeEach(function(){
      r = new Signal(new Collection(matchRoutes));
      r2 = new Signal(new Collection({
        index: {
          path: "/"
        }
      }));
    });

    it("#match(), check parameters", function(){

      var res0 = r2.match('/');
      res0._route.should.equal('index');

      var res = r.match('/basic/car/id-1.xmltest');
      res.type.should.equal('car');
      res.id.should.equal('1');
      res._format.should.equal('xml');

      (function(){
        var res = r.match('/basic/car/id-aaa.xmltest');
      }).should.throw(); //requirements dont match
      
      var res2 = r.match('/basic');
      res2.dog.should.equal('basic');
      res2._controller.should.equal('test');

      var res3 = r.match('/');
      res3.dog.should.equal('golden');
      res3._controller.should.equal('test');

      var res4 = r.match('/house/carA/user');
      res4.type.should.equal('A');
      res4.owner.should.equal('ad');

      var res5 = r.match('/house/carC/user/bart');
      res5.type.should.equal('C');
      res5.owner.should.equal('bart');

      var res6 = r.match('/carA/user');
      res6.type.should.equal('carA');
      res6.name.should.equal('ad');
      res6.slogan.should.equal('bier');

      var res7 = r.match('/api/carA/user');
      res7.type = 'A';
      res7.username = 'advanderveer';
      res7.car = 'bmw';

    });

    it("#generate(), check parameters", function(){

      (function(){
        r.generate('bogus', {}); //non existing
      }).should.throw();

      (function(){
        r.generate('house', {}); //to little arguments
      }).should.throw();

      (function(){
        r.generate('basic', {type: 'coupe', id: 'aa', _format: 'xml'});   //doesnot fit requirements
      }).should.throw();

      var url1 = r.generate('house', {type: 'coupe'}); 
      url1.should.equal('/house/carcoupe/user');
      var params = r.match(url1);
      r.generate('house', params).should.equal(url1);

      var url2 = r.generate('basic', {type: 'coupe', id: '1', _format: 'xml'});   //doesnot fit requirements
      url2.should.equal('/basic/coupe/id-1.xmltest');

    });

  });

});

},{"../src/collection.js":1,"../src/signal.js":2,"./examples/match_routes.json":3,"./examples/user_routes.json":4}]},{},[5])
;