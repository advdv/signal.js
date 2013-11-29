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
