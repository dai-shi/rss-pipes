/*
  Copyright (C) 2013, Daishi Kato <daishi@axlight.com>
  All rights reserved.

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
  "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
  LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
  A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
  HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
  SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
  LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
  DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
  THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
  OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

var aggregatorNameRegExp = require('./public/js/common.js').aggregatorNameRegExp;

var Schema = require('jugglingdb').Schema;
var schema;
if (process.env.DATABASE_URL) {
  schema = new Schema('postgres', {
    url: process.env.DATABASE_URL
  });
} else if (process.env.SQLITE_DB_FILE) {
  schema = new Schema('sqlite3', {
    database: process.env.SQLITE_DB_FILE
  });
} else {
  schema = new Schema('sqlite3', {
    database: '.datastore.db'
  });
}

var Aggregator = schema.define('Aggregator', {
  name: {
    type: String
  },
  description: {
    type: String
  },
  feeds: {
    type: String
  },
  filter: {
    type: String
  },
  browsable: {
    type: Boolean
  },
  lockcode: {
    type: String
  }
});

schema.autoupdate();

function getAggregator(name, callback) {
  Aggregator.findOne({
    where: {
      name: name
    }
  }, function(err, result) {
    if (err) {
      callback(err);
    } else {
      try {
        result.id = null;
        result.browsable = (result.browsable ? true : false);
        result.lockcode = (result.lockcode ? true : null);
        callback(null, result);
      } catch (e) {
        callback(e);
      }
    }
  });
}

function existsAggregator(name, callback) {
  Aggregator.count({
    name: name
  }, function(err, result) {
    if (err) {
      callback(err);
    } else {
      try {
        callback(null, (result ? true : false));
      } catch (e) {
        callback(e);
      }
    }
  });
}

function createNewAggregator(params, callback) {
  if (!params.name || !params.description || !params.feeds) {
    callback('name and description and feeds are required.');
    return;
  }
  if (!aggregatorNameRegExp.test(params.name)) {
    callback('invalid name format');
    return;
  }
  existsAggregator(params.name, function(err, exists) {
    if (err) {
      callback(err);
      return;
    }
    if (exists) {
      callback('already exists');
      return;
    }

    Aggregator.create(params, function(err, result) {
      if (err) {
        callback(err);
      } else {
        try {
          result.id = null;
          result.browsable = (result.browsable ? true : false);
          result.lockcode = (result.lockcode ? true : null);
          callback(null, result);
        } catch (e) {
          callback(e);
        }
      }
    });
  });
}

function listAggregators(callback) {
  Aggregator.all({
    where: {
      browsable: true
    }
  }, function(err, result) {
    if (err) {
      callback(err);
    } else {
      try {
        result.reverse().forEach(function(x) {
          x.id = null;
          x.browsable = (x.browsable ? true : false);
          x.lockcode = (x.lockcode ? true : null);
        });
        callback(null, result);
      } catch (e) {
        callback(e);
      }
    }
  });
}

function updateAggregator(params, callback) {
  if (!params.name) {
    callback('name is required.');
    return;
  }
  Aggregator.findOne({
    where: {
      name: params.name
    }
  }, function(err, agg) {
    if (err) {
      callback(err);
      return;
    }
    if (!agg) {
      callback('no such aggregator');
      return;
    }
    if (agg.lockcode && agg.lockcode !== params.lockcode) {
      setTimeout(function() {
        callback('lockcode mismatch');
      }, 3000);
      return;
    }

    ['description', 'feeds', 'filter', 'lockcode'].forEach(function(key) {
      if (params.hasOwnProperty(key)) {
        agg[key] = params[key];
      }
    });
    agg.save(function(err, result) {
      if (err) {
        callback(err);
      } else {
        try {
          result.id = null;
          result.browsable = (result.browsable ? true : false);
          result.lockcode = (result.lockcode ? true : null);
          callback(null, result);
        } catch (e) {
          callback(e);
        }
      }
    });
  });
}


exports.getAggregator = getAggregator;
exports.existsAggregator = existsAggregator;
exports.createNewAggregator = createNewAggregator;
exports.listAggregators = listAggregators;
exports.updateAggregator = updateAggregator;
