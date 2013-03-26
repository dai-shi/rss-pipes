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
  $scope.aggregators = Aggregator.list();
  $scope.createNewAggregator = function() {
    Aggregator.create($scope.newAgg, function() {
      $scope.newAgg = {
        browsable: true
      };
      $scope.mainAlerts.push({
        type: 'success',
        message: ($scope.lang === 'ja' ? '追加完了しました' : 'Done creating.')
      });
      $scope.aggregators = Aggregator.list();
    }, function() {
      $scope.mainAlerts.push({
        type: 'error',
        message: ($scope.lang === 'ja' ? '追加できませんでした' : 'Failed creating.')
      });
    });
  };
}];

var AggregatorEditCtrl = ['$scope', '$routeParams', '$http', 'Aggregator', function($scope, $routeParams, $http, Aggregator) {
  $scope.paramName = $routeParams.name;
  $scope.jQuery = jQuery;
  Aggregator.fetch({
    name: $scope.paramName
  }, function(data) {
    data.browsable = !! data.browsable;
    $scope.aggregator = data;
  });

  $scope.getRssContent = function() {
    var rssUrl = $scope.sitePrefix + '/aggregator/' + common.encodeAggregatorName($scope.paramName) + '.rss';
    $http.get(rssUrl).success(function(data) {
      $scope.rssDoc = jQuery($.parseXML(data));
    });
  };
  $scope.getRssContent();

  $scope.updateAggregator = function() {
    $scope.rssDoc = null;
    Aggregator.update($scope.aggregator, function() {
      $scope.mainAlerts.push({
        type: 'success',
        message: ($scope.lang === 'ja' ? '更新しました' : 'Done updating.')
      });
      $scope.getRssContent();
    }, function() {
      $scope.mainAlerts.push({
        type: 'error',
        message: ($scope.lang === 'ja' ? '更新できませんでした' : 'Failed updating.')
      });
    });
  };
}];

var mainModule = angular.module('MainModule', ['AggregatorServices']);

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
        name: null
      }
    },
    fetch: {
      method: 'GET'
    },
    update: {
      method: 'PUT'
    }
  });
}]);
