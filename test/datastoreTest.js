var assert = require('assert');
var fs = require('fs');

var tmp_test_db = './.datastore.db.tmp';
if (fs.existsSync(tmp_test_db)) {
  fs.unlinkSync(tmp_test_db);
}
process.env.SQLITE_DB_FILE = tmp_test_db;
var datastore = require('../datastore.js');

describe('basic test for datastore', function() {

  it('should fail to create a new empty agg', function(done) {
    datastore.createNewAggregator({}, function(err) {
      assert.ok(err);
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

});
