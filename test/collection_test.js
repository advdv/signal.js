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
