;(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var Signal = require('./src/signal.js');

module.exports = Signal;
},{"./src/signal.js":2}],2:[function(require,module,exports){
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
},{}]},{},[1])
;