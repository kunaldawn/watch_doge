let dogeApp = angular.module('dogeApp', ['btford.socket-io', 'doge.glue', 'ngMaterial']);

dogeApp.factory('io', function (socketFactory) {
    return socketFactory();
});

dogeApp.controller('dogeCtrl', function ($scope, io) {
    $scope.lines = 1000;
    $scope.all_lines = [];
    $scope.filtered_lines = [];
    $scope.includes = [];
    $scope.excludes = [];
    $scope.colors = [];

    io.on("line", function (data) {
        $scope.all_lines.push(data);
        if (!$scope.isExcluded(data) && $scope.isIncluded(data)) {
            $scope.filtered_lines.push(data)
        }
        console.log(data)
    });

    io.on("lines", function (data) {
        $scope.lines = data;
    });

    io.on("excludes", function (data) {
        if (data !== undefined) {
            $scope.excludes = data;
            $scope.onExcludeChange();
        }
    });

    io.on("includes", function (data) {
        if (data !== undefined) {
            $scope.includes = data;
            $scope.onIncludeChange();
        }
    });

    $scope.onExcludeChange = function () {
        $scope.filtered_lines = $scope.all_lines.filter(line => !$scope.isExcluded(line) && $scope.isIncluded(line))
    };

    $scope.onIncludeChange = function () {
        $scope.colors = [];
        for (let index = 0; index < $scope.includes.length; index++) {
            $scope.colors.push($scope.newColor())
        }

        $scope.filtered_lines = $scope.all_lines.filter(line => !$scope.isExcluded(line) && $scope.isIncluded(line))
    };

    $scope.isExcluded = function (line) {
        let isExcluded = false;
        for (const index in $scope.excludes) {
            if (line.match($scope.excludes[index])) {
                isExcluded = true;
                break;
            }
        }
        return isExcluded;
    };

    $scope.isIncluded = function (line) {
        if ($scope.includes.length === 0) {
            return true;
        }

        let isIncluded = false;
        for (const index in $scope.includes) {
            if (line.match($scope.includes[index])) {
                isIncluded = true;
                break;
            }
        }

        return isIncluded;
    };

    $scope.format = function (line) {
        for (const index in $scope.includes) {
            if (line.match($scope.includes[index])) {
                line = line.replace($scope.includes[index], "<b style='background-color:" + $scope.colors[index] + "'>" + $scope.includes[index] + "</b>")
            }
        }

        return line
    };

    $scope.newColor = function () {
        var letters = '6789ABCDEF';
        var color = '#';
        for (var i = 0; i < 6; i++) {
            color += letters[Math.floor(Math.random() * letters.length)];
        }
        return color;
    };

    console.log('%cThanks for using WATCH DOGE! 😊', 'font: 5em roboto; color: #dd4814;')
});

dogeApp.filter('html', function ($sce) {
    return function (txt) {
        return $sce.trustAsHtml(txt);
    };
});