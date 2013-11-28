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