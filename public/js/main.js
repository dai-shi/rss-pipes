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

/* global angular: false */
/* global common: false */

var AggregatorListCtrl = ['$scope', 'Aggregator', function($scope, Aggregator) {
  Aggregator.list(function(data) {
    var len = data.length;
    for (var i = 0; i < len; i++) {
      data[i].rssUrl = $scope.sitePrefix + '/aggregator/' + common.encodeAggregatorName(data[i].name) + '.rss';
    }
    $scope.aggregators = data;
  });
}];

var AggregatorEditCtrl = ['$scope', '$routeParams', '$http', 'Aggregator', function($scope, $routeParams, $http, Aggregator) {
  $scope.jQuery = jQuery;

  $scope.getRssContent = function() {
    $http.get($scope.rssUrl + '?debug=1').success(function(data) {
      $scope.rssDoc = jQuery($.parseXML(data));
    });
  };

  $scope.getAggregator = function(name) {
    Aggregator.fetch({
      name: name
    }, function(data) {
      data.browsable = !! data.browsable;
      $scope.aggregator = data;
      $scope.rssUrl = $scope.sitePrefix + '/aggregator/' + common.encodeAggregatorName(name) + '.rss';
      $scope.getRssContent();
    });
  };

  if ($routeParams.name) {
    $scope.paramName = $routeParams.name;
    $scope.getAggregator($routeParams.name);
  } else {
    $scope.aggregator = {
      browsable: true
    };
  }

  $scope.checking_name = false;
  $scope.checkAggregatorName = function(force) {
    if (!$scope.aggregator.name || !common.aggregatorNameRegExp.test($scope.aggregator.name)) {
      $scope.name_is_available = false;
      $scope.checking_name = false;
      return;
    }

    if (force || typeof $scope.name_is_available !== 'string') {
      if (!force) {
        $scope.checking_name = ($scope.lang === 'ja' ? '確認中...' : 'Checking...');
      }
      var savedName = $scope.aggregator.name;
      Aggregator.check({
        name: savedName
      }, function() {
        if (savedName === $scope.aggregator.name) {
          $scope.name_is_available = false;
          $scope.checking_name = false;
        } else {
          setTimeout(function() {
            $scope.checkAggregatorName(true);
          }, 10);
        }
      }, function() {
        if (savedName === $scope.aggregator.name) {
          $scope.name_is_available = true;
          $scope.checking_name = false;
        } else {
          setTimeout(function() {
            $scope.checkAggregatorName(true);
          }, 10);
        }
      });
    }
  };

  $scope.createNewAggregator = function() {
    Aggregator.create($scope.aggregator, function() {
      $scope.mainAlerts.push({
        type: 'success',
        message: ($scope.lang === 'ja' ? '登録完了しました' : 'Done creating.')
      });
      $scope.paramName = $scope.aggregator.name;
      $scope.rssUrl = $scope.sitePrefix + '/aggregator/' + common.encodeAggregatorName($scope.aggregator.name) + '.rss';
      $scope.getRssContent();
    }, function() {
      $scope.mainAlerts.push({
        type: 'error',
        message: ($scope.lang === 'ja' ? '登録できませんでした' : 'Failed creating.')
      });
    });
  };

  $scope.updateAggregator = function() {
    $scope.rssDoc = null;
    Aggregator.update($scope.aggregator, function() {
      $scope.mainAlerts.push({
        type: 'success',
        message: ($scope.lang === 'ja' ? '更新しました' : 'Done updating.')
      });
      $scope.rssUrl = $scope.sitePrefix + '/aggregator/' + common.encodeAggregatorName($scope.aggregator.name) + '.rss';
      $scope.getRssContent();
    }, function() {
      $scope.mainAlerts.push({
        type: 'error',
        message: ($scope.lang === 'ja' ? '更新できませんでした' : 'Failed updating.')
      });
    });
  };

  $scope.importFilterFromGist = function() {
    if (!$scope.gist_id) {
      return;
    }
    if ($scope.aggregator.filter) {
      if (!window.confirm($scope.lang === 'ja' ? '上書きされますがよろしいですか？' : 'Are you sure to overwrite?')) {
        $scope.gist_id = '';
        return;
      }
    }
    $http.get('/gist/' + $scope.gist_id + '.raw').success(function(data) {
      if (data) {
        $scope.aggregator.filter = data;
        $scope.gist_id = '';
      }
    }).error(function() {
      $scope.gist_id = '';
    });
  };

}];

var mainModule = angular.module('MainModule', ['ui', 'AggregatorServices']);

mainModule.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  when('/home', {
    templateUrl: 'partials/home.html',
    controller: AggregatorListCtrl
  }).
  when('/edit', {
    templateUrl: 'partials/edit.html',
    controller: AggregatorEditCtrl
  }).
  otherwise({
    redirectTo: '/home'
  });
}]);

mainModule.run(['$rootScope', function($rootScope) {
  $rootScope.mainAlerts = [];
  $rootScope.dismissAlert = function(mainAlert) {
    var mainAlerts = $rootScope.mainAlerts;
    for (var i = 0; i < mainAlerts.length; i++) {
      if (mainAlerts[i] === mainAlert) {
        mainAlerts.splice(i, 1);
        break;
      }
    }
  };
  $rootScope.autoDismissAlert = function(mainAlert) {
    setTimeout(function() {
      $rootScope.$apply(function() {
        $rootScope.dismissAlert(mainAlert);
      });
    }, 1500);
  };
  $rootScope.encodeAggregatorName = common.encodeAggregatorName;
}]);

var aggregatorServices = angular.module('AggregatorServices', ['ngResource']);

aggregatorServices.factory('Aggregator', ['$resource', function($resource) {
  return $resource('../rest/aggregators/:name', {
    name: '@name'
  }, {
    list: {
      method: 'GET',
      isArray: true
    },
    create: {
      method: 'POST',
      params: {
        name: ''
      }
    },
    check: {
      method: 'HEAD'
    },
    fetch: {
      method: 'GET'
    },
    update: {
      method: 'PUT'
    }
  });
}]);
