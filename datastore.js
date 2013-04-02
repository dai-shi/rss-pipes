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
  }
});

schema.autoupdate();

function safeCallback(cb) {
  return function() {
    try {
      cb.apply(cb, arguments);
    } catch (e) {
      cb(e);
    }
  };
}

function getAggregator(name, callback) {
  Aggregator.findOne({
    where: {
      name: name
    }
  }, safeCallback(callback));
}

function existsAggregator(name, callback) {
  Aggregator.count({
    name: name
  }, safeCallback(callback));
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

    Aggregator.create(params, safeCallback(callback));
  });
}

function listAggregators(callback) {
  Aggregator.all({
    where: {
      browsable: true
    }
  }, callback);
}

function updateAggregator(params, callback) {
  if (!params.name) {
    callback('name is required.');
    return;
  }
  getAggregator(params.name, function(err, agg) {
    if (err) {
      callback(err);
      return;
    }
    if (!agg) {
      callback('no such aggregator');
      return;
    }

    ['description', 'feeds', 'filter'].forEach(function(key) {
      if (params.hasOwnProperty(key)) {
        agg[key] = params[key];
      }
    });
    agg.save(safeCallback(callback));
  });
}


//TODO expire aggregator (based on last access)
//TODO import&export (admin)

exports.getAggregator = getAggregator;
exports.existsAggregator = existsAggregator;
exports.createNewAggregator = createNewAggregator;
exports.listAggregators = listAggregators;
exports.updateAggregator = updateAggregator;
