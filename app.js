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

/* jshint es5: true */
/* jshint evil: true */

var vm = require('vm');
var path = require('path');
var express = require('express');
var async = require('async');
var feedparser = require('feedparser');
var rss = require('rss');
var request = require('request');
var datastore = require('./datastore.js');

var encodeAggregatorName = require('./public/js/common.js').encodeAggregatorName;

var sitePrefix = process.env.SITE_PREFIX || 'http://rss-pipes.herokuapp.com';

var app = express();
app.configure(function() {
  app.use(express.logger());
  app.use(express.json());
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
});

function filterArticles(articles, filterStr) {
  return vm.runInNewContext('(' + filterStr + ')(articles);', {
    articles: articles
  });
}

function generateRss(aggregatorName, options, callback) {
  datastore.getAggregator(aggregatorName, function(err, agg) {
    if (err) {
      callback(err);
      return;
    }
    var urls = agg.feeds.split('\n');
    async.map(urls, function(url, cb) {
      if (!url) {
        cb([]);
        return;
      }
      try {
        feedparser.parseUrl(url, function(err, meta, articles) {
          if (err) {
            throw err;
          }
          cb(null, articles);
        });
      } catch (err) {
        console.log('error by aggregator "' + aggregatorName + '" in parsing "' + url + '":', err);
        cb(null, []);
      }
    },

    function(err, articlesArray) {
      // we assume err is always null.
      var allArticles = [].concat.apply([], articlesArray);
      if (agg.filter) {
        try {
          allArticles = filterArticles(allArticles, agg.filter);
        } catch (e) {
          if (options.debug) {
            callback(e);
            return;
          }
        }
      }
      var feed_url = sitePrefix + '/aggregator/' + encodeAggregatorName(aggregatorName) + '.rss';
      var site_url = sitePrefix + '/static/main.html#/edit?name=' + encodeURIComponent(aggregatorName);
      var feed = new rss({
        title: aggregatorName + ' by RSS Pipes',
        description: agg.description,
        feed_url: feed_url,
        site_url: site_url
      });
      allArticles.forEach(function(article) {
        feed.item({
          title: article.title,
          description: article.description,
          url: article.link,
          guid: article.guid,
          author: article.author,
          date: article.date
        });
      });
      callback(null, feed.xml());
    });
  });
}

app.get('/', function(req, res) {
  res.send('It works!');
});

app.get(new RegExp('^/aggregator/(.+)\\.rss$'), function(req, res) {
  var aggregatorName = req.params[0];
  generateRss(aggregatorName, req.query, function(err, result) {
    if (err) {
      console.log('failed in generateRss:', err);
      res.send(500, 'failed generating rss (' + err + ')');
    } else {
      res.send(result);
    }
  });
});

app.get('/rest/aggregators', function(req, res) {
  datastore.listAggregators(function(err, result) {
    if (err) {
      console.log('failed in listAggregators:', err);
      res.send(500, 'failed listing aggregators');
    } else {
      res.json(result);
    }
  });
});

app.post('/rest/aggregators', function(req, res) {
  datastore.createNewAggregator(req.body, function(err) {
    if (err) {
      console.log('failed in createNewAggregator:', err);
      res.send(500, 'failed creating an aggregator');
    } else {
      res.json(true);
    }
  });
});

app.get(new RegExp('^/rest/aggregators/(.+)$'), function(req, res) {
  var aggregatorName = req.params[0];
  datastore.getAggregator(aggregatorName, function(err, result) {
    if (err) {
      console.log('failed in getAggregator:', err);
      res.send(500, 'failed getting an aggregator');
    } else {
      res.json(result);
    }
  });
});

app.head(new RegExp('^/rest/aggregators/(.+)$'), function(req, res) {
  var aggregatorName = req.params[0];
  datastore.existsAggregator(aggregatorName, function(err, exists) {
    if (err) {
      console.log('failed in getAggregator:', err);
      res.send(500, 'failed getting an aggregator');
    } else if (!exists) {
      res.send(404);
    } else {
      res.send(200);
    }
  });
});

app.put(new RegExp('^/rest/aggregators/(.+)$'), function(req, res) {
  var aggregatorName = req.params[0];
  if (req.body.name) {
    if (req.body.name !== aggregatorName) {
      res.send(500, 'unmatched aggregator name');
      return;
    }
  } else {
    req.body.name = aggregatorName;
  }

  datastore.updateAggregator(req.body, function(err, result) {
    if (err) {
      console.log('failed in updateAggregator:', err);
      res.send(500, 'failed updating an aggregator');
    } else {
      res.json(result);
    }
  });
});

app.get(new RegExp('^/gist/(.+)\\.raw$'), function(req, res) {
  var gist_id = req.params[0];
  request('http://gist.github.com/' + gist_id + '/raw/', function(err, response, body) {
    if (err) {
      console.log('failed in getting a gist[1]:', err);
      res.send(500, 'failed getting a gist');
    } else if (response.statusCode !== 200) {
      console.log('failed in getting a gist[2]:', response);
      res.send(500, 'failed getting a gist');
    } else {
      res.send(body);
    }
  });
});

app.get(new RegExp('^/static/(.+)\\.html$'), function(req, res) {
  var view_name = req.params[0];
  var lang = '';
  if (req.headers['accept-language']) {
    lang = req.headers['accept-language'].substring(0, 2);
  }
  res.render(view_name, {
    lang: lang,
    sitePrefix: sitePrefix
  });
});

app.use('/static', express.static(path.join(__dirname, 'public')));

app.listen(process.env.PORT || 5000);
