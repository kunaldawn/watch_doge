let dogeApp = angular.module('dogeApp', ['btford.socket-io', 'doge.glue', 'ngMaterial']);

dogeApp.factory('io', function (socketFactory) {
    return socketFactory();
});

dogeApp.controller('dogeCtrl', function ($scope, io) {
    $scope.lines = 1000;
    $scope.data = [];
    $scope.includes = [];
    $scope.excludes = [];

    io.on("line", function (data) {
        while ($scope.data.length > $scope.lines) {
            $scope.data.shift()
        }
        $scope.data.push(data)
    });

    io.on("lines", function (data) {
        $scope.lines = data;
    });

    io.on("excludes", function (data) {
        if (data !== undefined) {
            $scope.excludes = data;
        }
    });

    io.on("includes", function (data) {
        if (data !== undefined) {
            $scope.includes = data;
        }
    });

    $scope.dogeFilter = function (line) {
        if ($scope.includes.length === 0 && $scope.excludes.length === 0) {
            return true;
        }

        for (const index in $scope.excludes) {
            if (line.match($scope.excludes[index])) {
                return false;
            }
        }

        for (const index in $scope.includes) {
            if (line.match($scope.includes[index])) {
                return true;
            }
        }

        return true
    };

    $scope.format = function (line) {
        for (const index in $scope.includes) {
            if (line.match($scope.includes[index])) {
                line = line.replace($scope.includes[index], "<b style='background-color:chartreuse'>" + $scope.includes[index] + "</b>")
            }
        }

        return line
    };

    console.log('%cThanks for using WATCH DOGE! 😊', 'font: 5em roboto; color: #dd4814;')
});

dogeApp.filter('formatter', function($sce) {
    return function(txt) {
        return $sce.trustAsHtml(txt);
    };
});