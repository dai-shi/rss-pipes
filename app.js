/*
  Copyright (C) 2013 Daishi Kato <daishi@axlight.com>

  Redistribution and use in source and binary forms, with or without
  modification, are permitted provided that the following conditions are met:

    * Redistributions of source code must retain the above copyright
      notice, this list of conditions and the following disclaimer.
    * Redistributions in binary form must reproduce the above copyright
      notice, this list of conditions and the following disclaimer in the
      documentation and/or other materials provided with the distribution.

  THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
  AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
  IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
  ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
  DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
  (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
  LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
  ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
  (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
  THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/* jshint es5: true */
/* jshint evil: true */

var express = require('express');
var path = require('path');
var async = require('async');
var feedparser = require('feedparser');
var rss = require('rss');
var datastore = require('./datastore.js');

var app = express();
app.configure(function() {
  app.use(express.logger());
  app.set('views', path.join(__dirname, 'views'));
  app.set('view engine', 'jade');
});


function encodeAggregatorName(name) {
  return name.split('/').map(encodeURIComponent).join('/');
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
      feedparser.parserUrl(url, function(err, meta, articles) {
        if (err) {
          console.log('error by aggregator "' + aggregatorName + '" in parsing "' + url + '":', err);
          cb(null, []);
          return;
        }
        cb(null, articles);
      }, function(err, articlesArray) {
        // we assume err is always null.
        var allArticles = [].concat.apply([], articlesArray);
        //TODO filter them
        var feed_url = 'http://rss-pipes.herokuapp.com/aggregator/' + encodeAggregatorName(aggregatorName) + '.rss';
        var feed = new rss({
          title: 'RSS pipes: ' + aggregatorName,
          feed_url: feed_url,
          site_url: feed_url
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
  });
}

app.get('/', function(req, res) {
  res.send('It works!');
});

app.get(new RegExp('^/aggregator/(.+)\\.rss$'), function(req, res) {
  var aggregatorName = req.params[0];
  generateRss(aggregatorName, req.query, function(err, result) {
    if (err) {
      console.log('failed in generateRss', err);
      res.send(500, 'failed generating rss');
    } else {
      res.send(result);
    }
  });
});


app.use('/static', express.static(path.join(__dirname, 'public')));

app.listen(process.env.PORT || 5000);
