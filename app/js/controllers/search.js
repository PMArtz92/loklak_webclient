'use strict';
/* global angular */

var controllersModule = require('./_index');
var PhotoSwipe = require('photoswipe');
var PhotoSwipeUI_Default = require('../components/photoswipe-ui-default');
/**
 * @ngInject
 */

controllersModule.controller('SearchCtrl', ['$stateParams', '$timeout', '$location', '$filter', 'SearchService', 'DebugLinkService', function($stateParams, $timeout, $location, $filter, SearchService, DebugLinkService) {

    // Define models here
    var vm = this;
    vm.modal = { text: "Tweet content placeholder"};
    vm.showDetail = false;
    vm.showResult = false;
    vm.term = '';
    vm.currentFilter = '';
        
    // Init statuses if path is a search url
    angular.element(document).ready(function() {
        if ($stateParams.q !== undefined) {
            evalSearchQuery();
            var filterFn = 'filter' + $filter('capitalize')(vm.currentFilter);
            vm[filterFn]();   
            vm.showResult = true;
      }
    });

    // Update status and path on successful search
    vm.update = function(term) {
        SearchService.getData(term).then(function(data) {
               vm.statuses = data.statuses;
               vm.showResult = true;
               updatePath(term);
        }, function() {});
    };


    // No filter search
    vm.filterLive = function() {
        vm.currentFilter = 'live';
        var term = vm.term;
        vm.update(term);
    };

    // Photos search
    vm.filterPhotos = function() {
        vm.currentFilter = 'photos';
        var term = vm.term + '+' + '/image';
        vm.update(term);
    };

    // Videos search
    // Do manual req, when done, filter status with video, and then update vm.statuses
    // With help of DebugLinkService
    vm.filterVideos = function() {
        vm.statuses = [];   
        vm.currentFilter = 'videos';
        vm.showResult = true;

        // Get most videos
        SearchService.getData(vm.term).then(function(data) {
            var statuses = data.statuses;
            statuses.forEach(function(status) {
                if (hasExternalLink(status)) {
                    DebugLinkService.debugLink(status.links[0]).then(function(data) {
                        if (data.type === 'video') {
                            vm.statuses.push(status);        
                        }
                    }, function() {return;});
                }
            });
        }, function() {});

        // Get native videos
        $timeout(function() {
            SearchService.getData(vm.term + '+' + '/video').then(function(data) {
                var statuses = data.statuses;
                statuses.forEach(function(status) {
                    if (status.videos_count && status.videos[0].substr(-4) === '.mp4') {
                        vm.statuses.push(status);
                    }
                });
            }, function() {});    
        }, 2000);
        
        updatePath(vm.term + '+' + '/video');
    };


    // Create photoswipe
    // Lib's docs: http://photoswipe.com/documentation/getting-started.html
    vm.openSwipe = function(status_id) {
        var items = [];
        var images  = angular.element('#' + status_id + ' .images-wrapper img');
        var options = { index: 0, history: false};
        var swipeEle = document.querySelectorAll('.pswp')[0];
        var swipeObject = 'gallery' + status_id;

        angular.forEach(images, function(image) {
            this.push(scrapeImgTag(image));
        }, items);
       
        $timeout(function() {
            window[swipeObject] = new PhotoSwipe(swipeEle, PhotoSwipeUI_Default, items, options);
            window[swipeObject].init();    
        }, 0);
    };


    // HELPERS FN
    ///////////////////

    // Scrape for imgTag to serve photoswipe requirement
    function scrapeImgTag(imgTag) {
        var ngEle = angular.element(imgTag);
        return {
            src: ngEle.attr('src'),
            w: parseInt(ngEle.css('width').replace('px', '')),
            h: parseInt(ngEle.css('height').replace('px', ''))
        };
    }

    // Change stateParams on search
    function updatePath(query) {
      $location.search({
        q: query,
        timezoneOffset: (new Date()).getTimezoneOffset()
      });
    }

    // Evaluate current search query to extract term & filter
    function evalSearchQuery() {
        var queryParts = $location.search().q.split('+');
        var queryToFilter = {
            '/image': 'photos',
            '/video': 'videos'
        };

        vm.term = queryParts[0];
        vm.currentFilter = (queryParts[1]) ? queryToFilter[queryParts[1]] : 'live';
    }

    // Check if a status has external link, twitter pic src is not considered as external
    function hasExternalLink(status) {
        if (!status.links[0]) {
            return false;
        } else if (status.links[0].indexOf('pbs.twimg.com') > -1) {
            return false;
        } else {
            return true;    
        }
    }
}]);