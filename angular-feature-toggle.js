(function(angular) {
  'use strict';
  angular.module('yh.featureToggle', ['semver'])
    .config(initFeatures)
    .config(overrideUIRouterStateFn)
    .provider('featureToggle', featureToggle)
    .directive('showIfFeature', showIfFeature)
    .directive('hideIfFeature', hideIfFeature);


  function initFeatures(featureToggleProvider) {
    if (window.angularFeaturesConf) {
      featureToggleProvider.init(window.angularFeaturesConf);
    }
    else {
      window.console.warn('could not detect features');
    }
  }

///////////////
// config ui router
  function overrideUIRouterStateFn($injector, featureToggleProvider) {
    try {
      var $stateProvider = $injector.get('$stateProvider');

      // the app uses ui.router, configure it
      var oldStateFn = $stateProvider.state;
      $stateProvider.state = function(name, conf) {
        // enable state if feature version is satisfied or undefined
        if ((conf.version === undefined) || (featureToggleProvider.isVersion(conf.feature || name, conf.version))) {
          try {
            return oldStateFn.call($stateProvider, name, conf);
          }
          catch(e) {
            window.console && window.console.warn('state ' + name + ' is already defined'); // jshint ignore:line
            return $stateProvider;
          }
        }
        // else return stateProvider for further state declaration chaining
        else {
          return $stateProvider;
        }
      };
    } catch(e) {
        // the app doesnt use ui.router - silent failure
    }
  }


// factory
  function featureToggle(semverProvider) {
    var semver = semverProvider;
    // define Feature model
    function Feature(version) {
      this.version = version;
    }

    Feature.prototype.isVersion = function(versionToCheck) {
      return semver.satisfies(this.version, versionToCheck);
    };

    Feature.prototype.isEnabled = function() {
      return semver.satisfies(this.version, '*');
    };


    /////////////////
    var features = {};

    var service = {
      init: init,
      features: features,
      isVersion: isVersion,
      isEnabled: isEnabled,
      $get: featureToggleFactory
    };
    return service;

    ////////////

    function init(featuresObj) {
      features = featuresObj;
    }

    function isVersion(feature, versionToCheck) {
      return semver.satisfies(features[feature], versionToCheck);
    }

    function isEnabled(feature) {
      return !!features[feature];
    }

    function featureToggleFactory() {
      return {
        isVersion: isVersion,
        isEnabled: isEnabled
      };
    }
  }

  function showIfFeature(featureToggle) {
    var ddo = {
      restrict: 'AE',
      transclude: 'element',
      terminal: true,
      priority: 999,
      link: link
    };

    return ddo;

    function link(scope, element, attrs, ctrl, $transclude) {
      var featureEl, childScope, featureName;
      var featureVersion = '*';
      var args = attrs.showIfFeature.split(/\s+/);
      featureName = args[0];
      if (args.length > 1) {
         featureVersion = args[1];
      }

      if (featureToggle.isVersion(featureName, featureVersion)) {
          childScope = scope.$new();
          $transclude(childScope, function(clone) {
              featureEl = clone;
              element.after(featureEl).remove();
          });
      } else {
          if(childScope) {
              childScope.$destroy();
              childScope = null;
          }
          if(featureEl) {
              featureEl.after(element).remove();
              featureEl = null;
          }
      }
    }
  }

  function hideIfFeature(featureToggle) {
    var ddo = {
      restrict: 'AE',
      transclude: 'element',
      terminal: true,
      priority: 999,
      link: link
    };

    return ddo;

    function link(scope, element, attrs, ctrl, $transclude) {
      var featureEl, childScope, featureName;
      var featureVersion = '*';
      var args = attrs.hideIfFeature.split(/\s+/);
      featureName = args[0];
      if (args.length > 1) {
         featureVersion = args[1];
      }

      if (featureToggle.isVersion(featureName, featureVersion)) {
        if(childScope) {
            childScope.$destroy();
            childScope = null;
        }
        if(featureEl) {
            featureEl.after(element).remove();
            featureEl = null;
        }
      } else {
        childScope = scope.$new();
        $transclude(childScope, function(clone) {
            featureEl = clone;
            element.after(featureEl).remove();
        });
      }
    }
  }
})(window.angular);
