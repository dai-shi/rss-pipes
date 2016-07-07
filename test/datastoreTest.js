/* eslint-env mocha */

var assert = require('assert');
var fs = require('fs');

describe('basic test for datastore', function() {
  var datastore;

  before(function(done) {
    var tmp_test_db = './.datastore.db.tmp';
    var callback = function() {
      process.env.SQLITE_DB_FILE = tmp_test_db;
      datastore = require('../datastore.js');
      datastore.createNewAggregator({
        name: 'dummy',
        description: 'dummy',
        feeds: 'dummy'
      }, function() {
        //ignore error
        done();
      });
    };
    fs.exists(tmp_test_db, function(exists) {
      if (exists) {
        fs.unlink(tmp_test_db, callback);
      } else {
        callback();
      }
    });
  });

  it('should fail to create a new empty agg', function(done) {
    datastore.createNewAggregator({}, function(err) {
      assert.ok(err);
      done();
    });
  });

  it('should not exists an agg', function(done) {
    datastore.existsAggregator('hoge', function(err, exists) {
      assert.ifError(err);
      assert.ok(!exists);
      done();
    });
  });

  it('should create a new agg', function(done) {
    datastore.createNewAggregator({
      name: 'hoge',
      description: 'desc1',
      feeds: 'feed1',
      browsable: true
    }, function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('should exists an agg', function(done) {
    datastore.existsAggregator('hoge', function(err, exists) {
      assert.ifError(err);
      assert.ok(exists);
      done();
    });
  });

  it('should fail to create the same-name agg', function(done) {
    datastore.createNewAggregator({
      name: 'hoge',
      description: 'desc1a',
      feeds: 'feed1a',
      browsable: true
    }, function(err) {
      assert.ok(err);
      done();
    });
  });

  it('should get the created agg', function(done) {
    datastore.getAggregator('hoge', function(err, agg) {
      assert.ifError(err);
      assert.equal(agg.name, 'hoge');
      done();
    });
  });

  it('should create another new agg', function(done) {
    datastore.createNewAggregator({
      name: 'hoge2',
      description: 'desc2',
      feeds: 'feed2',
      browsable: true
    }, function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('should create a hidden agg', function(done) {
    datastore.createNewAggregator({
      name: 'hoge3',
      description: 'desc3',
      feeds: 'feed3',
      browsable: false
    }, function(err) {
      assert.ifError(err);
      done();
    });
  });

  it('should list all browsable aggs', function(done) {
    datastore.listAggregators(function(err, result) {
      assert.ifError(err);
      assert.equal(result.length, 2);
      assert.ok((result[0].name === 'hoge' && result[1].name === 'hoge2') || (result[1].name === 'hoge' && result[0].name === 'hoge2'));
      done();
    });
  });

  it('should update an agg', function(done) {
    datastore.updateAggregator({
      name: 'hoge',
      description: 'newdesc'
    }, function(err) {
      assert.ifError(err);
      datastore.getAggregator('hoge', function(err, result) {
        assert.ifError(err);
        assert.equal(result.description, 'newdesc');
        done();
      });
    });
  });

  it('should fail to update non-existent agg', function(done) {
    datastore.updateAggregator({
      name: 'non-hoge',
      description: 'newdesc'
    }, function(err) {
      assert.ok(err);
      done();
    });
  });

  it('should lock an agg', function(done) {
    datastore.updateAggregator({
      name: 'hoge',
      lockcode: 'code999'
    }, function(err) {
      assert.ifError(err);
      datastore.getAggregator('hoge', function(err, result) {
        assert.ifError(err);
        assert.equal(result.lockcode, true);
        done();
      });
    });
  });

  it('should update the locked agg', function(done) {
    datastore.updateAggregator({
      name: 'hoge',
      lockcode: 'code999',
      description: 'newdesc2'
    }, function(err) {
      assert.ifError(err);
      datastore.getAggregator('hoge', function(err, result) {
        assert.ifError(err);
        assert.equal(result.description, 'newdesc2');
        done();
      });
    });
  });

  it('should fail to update the locked agg w/o lockcode', function(done) {
    datastore.updateAggregator({
      name: 'hoge',
      description: 'newdesc3'
    }, function(err) {
      assert.ok(err);
      done();
    });
  });


});
