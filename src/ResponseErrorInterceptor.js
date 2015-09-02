'use strict';

/**
 * @ngInject
 */
function ResponseErrorInterceptorProvider($injector) {

  var errors = [];
  var stateName;


  var provider = {
    addErrorHandling: addErrorHandling,
    $get: ['$q', '$rootScope', 'StateChangeErrorHandler', 'AlertService',
      function ($q, $rootScope, StateChangeErrorHandler, AlertService) {

        $rootScope.$on('$stateChangeStart', function (event, toState) {
          stateName = toState.name;
        });

        $rootScope.$on('$stateChangeSuccess', function () {
          stateName = '';
        });

        var ResponseErrorInterceptor = {
          responseError: responseError
        };

        return ResponseErrorInterceptor;

        ///////

        function responseError(error) {
          for (var i = 0, len = errors.length; i < len; i++) {
            if (isErrorValidator(errors[i], error)) {
              var errMessage = errors[i].errorMessage;

              if (errMessage !== null && typeof errMessage === 'object') {
                errMessage = getCustomErrorMessage(errors[i], error);
              }

              AlertService.add('danger', errMessage);
              break;
            }
          }

          return $q.reject(error);
        }

        function isErrorValidator(errorValidator, error) {
          return matchUrl(errorValidator, error.config) &&
            error.config.method === errorValidator.method &&
            StateChangeErrorHandler.hasStateError(stateName) === false;
        }

        function getCustomErrorMessage(validator, error) {
          var errorData = error.data;
          var customErrorMessages = validator.errorMessage.custom;

          if (customErrorMessages && customErrorMessages.length > 0) {
            var filterLength = customErrorMessages.length;
            for (var i = 0; i < filterLength; i++) {
              var filter = customErrorMessages[i];
              if (filter.status === error.status &&
                ((errorData && filter.code === errorData.code) || (typeof filter.code === 'undefined'))) {
                return filter.message;
              }
            }
          }

          return validator.errorMessage.default;
        }

        function matchUrl(validator, config) {
          if (!validator || !config || !config.url) {
            return false;
          }

          var matchResult = validator.errorUrl.exec(config.url, config.params);
          if (matchResult) {
            for (var key in matchResult) {
              if (matchResult[key] === undefined) {
                return false;
              }
            }
            return true;
          }
          return false;
        }
      }]
  };

  return provider;

  ////////

  /**
   *
   * example for PATCH Request:
   * 'url', 'PATCH', 'error-translation-key'
   *
   * example for exclude http-status:400 with response error-code:100
   * 'url', 'PATCH', 'error-translation-key', [{status: 400, code: 100, message: 'translation.key}]
   *
   * example for exclude http-status:409
   * 'url', 'PATCH', 'error-translation-key', [{status: 409, message: 'translation.key}]
   *
   * @param errorUrl
   * @param method
   * @param errorMessage
   */
  function addErrorHandling(errorUrl, method, errorMessage) {

    if ($injector.has('$urlMatcherFactoryProvider') === false) {
      throw new Error('mi.AlertService.ResponseErrorInterceptorProvider:No $urlMatcherFactoryProvider was found. This is a dependency to AngularUI Router.');
    }

    errors.push({
      errorUrl: $injector.get('$urlMatcherFactoryProvider').compile(errorUrl),
      method: method,
      errorMessage: errorMessage
    });
  }

}

module.exports = ResponseErrorInterceptorProvider;
