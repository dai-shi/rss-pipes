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

var AggregatorCtrl = ['$scope', 'Aggregator', function($scope, Aggregator) {
  $scope.aggregators = Aggregator.list();
  $scope.createNewAggregator = function() {
    Aggregator.create($scope.newAgg, function() {
      $scope.newAgg = {
        browsable: true
      };
      var mainAlert = {
        type: 'success',
        message: ($scope.lang === 'ja' ? '追加完了しました' : 'Done creating.')
      };
      $scope.mainAlerts.push(mainAlert);
      $scope.aggregators = Aggregator.list();
    }, function() {
      var mainAlert = {
        type: 'error',
        message: ($scope.lang === 'ja' ? '追加できませんでした' : 'Failed creating.')
      };
      $scope.mainAlerts.push(mainAlert);
    });
  };
}];

var mainModule = angular.module('MainModule', ['AggregatorServices']);

mainModule.config(['$routeProvider', function($routeProvider) {
  $routeProvider.
  when('/home', {
    templateUrl: 'partials/home.html',
    controller: AggregatorCtrl
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
  return $resource('../rest/aggregators', {}, {
    list: {
      method: 'GET',
      isArray: true
    },
    create: {
      method: 'POST'
    }
  });
}]);
