'use strict';

describe('Service :  ResponseErrorInterceptor', function () {
  var $rootScope, $q, interceptor, StateChangeErrorHandler, AlertService, updateItemMessages;

  beforeEach(function () {
    angular.mock.module('mi.AlertService');
    angular.mock.module(function ($provide) {
      AlertService = jasmine.createSpyObj('AlertService', ['add']);
      StateChangeErrorHandler = jasmine.createSpyObj('StateChangeErrorHandler', ['hasStateError']);

      $provide.service('AlertService', function () {
        return AlertService;
      });
      $provide.factory('StateChangeErrorHandler', function () {
        return StateChangeErrorHandler;
      });
    });
  });

  describe('tests without angular-ui-router', function () {
    var provider;
    beforeEach(function () {
      angular.mock.module(function (ResponseErrorInterceptorProvider) {
        provider = ResponseErrorInterceptorProvider;
      });
    });

    it('should', angular.mock.inject(function () {
      expect(function () {
        provider.addErrorHandling('dummyUri', 'GET', 'error')
      }).toThrowError('mi.AlertService.ResponseErrorInterceptorProvider:No $urlMatcherFactoryProvider was found. This is a dependency to AngularUI Router.')
    }));
  });

  describe('tests with angular-ui-router', function () {

    beforeEach(function () {
      angular.mock.module('ui.router.util');

      angular.mock.module(function (ResponseErrorInterceptorProvider) {

        updateItemMessages = {
          custom: [{
            status: 400,
            code: 100,
            message: 'my custom error message'
          }, {
            status: 409,
            message: 'my custom error message for http status 409'
          }],
          default: 'error default'
        };

        ResponseErrorInterceptorProvider.addErrorHandling('dummyUri', 'GET', 'error');
        ResponseErrorInterceptorProvider.addErrorHandling('dummyFilterUri', 'GET', updateItemMessages);
        ResponseErrorInterceptorProvider.addErrorHandling('http://dummy.de/list/{vid}', 'GET', 'error getting item');
        ResponseErrorInterceptorProvider.addErrorHandling('http://dummy.de/list?search_term', 'GET', 'error search-param');
        ResponseErrorInterceptorProvider.addErrorHandling('http://dummy.de/list?limit&offset', 'GET', 'error paging-param');
        ResponseErrorInterceptorProvider.addErrorHandling('http://dummy.de/list', 'DELETE', 'error delete');
      });

      angular.mock.inject(function ($injector) {
        $q = $injector.get('$q');
        $rootScope = $injector.get('$rootScope');
        interceptor = $injector.get('ResponseErrorInterceptor');
      });
    });

    it('should do nothing if error has no config', function () {
      interceptor.responseError({});
      expect(AlertService.add).not.toHaveBeenCalled();
    });

    it('should do nothing if error url does not match', function () {
      interceptor.responseError({config: {url: 'wrong'}});
      expect(AlertService.add).not.toHaveBeenCalled();
    });

    it('should do nothing if error method does not match', function () {
      interceptor.responseError({config: {url: 'dummyUri', method: 'POST'}});
      expect(AlertService.add).not.toHaveBeenCalled();
    });

    it('should do nothing if it exist a error handling for this state', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(true);

      interceptor.responseError({config: {url: 'dummyUri', method: 'GET'}});
      expect(AlertService.add).not.toHaveBeenCalled();
      expect(StateChangeErrorHandler.hasStateError).toHaveBeenCalledWith('stateName');
    });

    it('should do nothing if it exist a error handling for this state and reset stateName if stateChange was successful', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(true);

      interceptor.responseError({config: {url: 'dummyUri', method: 'GET'}});
      expect(AlertService.add).not.toHaveBeenCalled();
      expect(StateChangeErrorHandler.hasStateError).toHaveBeenCalledWith('stateName');
      $rootScope.$broadcast('$stateChangeSuccess');
      $rootScope.$apply();
      interceptor.responseError({config: {url: 'dummyUri', method: 'GET'}});
      expect(AlertService.add).not.toHaveBeenCalled();
      expect(StateChangeErrorHandler.hasStateError).toHaveBeenCalledWith('');
    });

    it('should emit an error', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(false);

      interceptor.responseError({config: {url: 'dummyUri', method: 'GET'}});
      expect(AlertService.add).toHaveBeenCalledWith('danger', 'error');
      expect(StateChangeErrorHandler.hasStateError).toHaveBeenCalledWith('stateName');
    });


    it('should throw error paging', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(false);

      interceptor.responseError({
        config: {
          url: 'http://dummy.de/list',
          method: 'GET',
          params: {
            offset: '3',
            limit: '4',
            search_term: undefined
          }
        }
      });

      expect(AlertService.add).toHaveBeenCalledWith('danger', 'error paging-param');
      expect(AlertService.add.calls.count()).toEqual(1);
      expect(StateChangeErrorHandler.hasStateError).toHaveBeenCalledWith('stateName');
    });


    it('should throw error search failed', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(false);

      interceptor.responseError({
        config: {
          url: 'http://dummy.de/list',
          method: 'GET',
          params: {
            offset: '5',
            limit: '6',
            search_term: 'blaa'
          }
        }
      });

      expect(AlertService.add).toHaveBeenCalledWith('danger', 'error search-param');
      expect(AlertService.add.calls.count()).toEqual(1);
      expect(StateChangeErrorHandler.hasStateError).toHaveBeenCalledWith('stateName');
    });

    it('should display custom error message', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(false);

      interceptor.responseError({
        config: {url: 'dummyFilterUri', method: 'GET'},
        data: {code: 100, message: 'some error'},
        status: 400
      });
      expect(AlertService.add).toHaveBeenCalledWith('danger', 'my custom error message');
      expect(AlertService.add.calls.count()).toEqual(1);
    });

    it('should display custom error message for http status without error-code', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(false);

      interceptor.responseError({
        config: {url: 'dummyFilterUri', method: 'GET'},
        data: {message: 'some error'},
        status: 409
      });
      expect(AlertService.add).toHaveBeenCalledWith('danger', 'my custom error message for http status 409');
      expect(AlertService.add.calls.count()).toEqual(1);
    });

    it('should display default error message if no custom errors are set', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(false);

      delete updateItemMessages.custom;

      interceptor.responseError({
        config: {url: 'dummyFilterUri', method: 'GET'},
        data: {code: 100, message: 'some error'},
        status: 400
      });

      expect(AlertService.add).toHaveBeenCalledWith('danger', 'error default');
      expect(AlertService.add.calls.count()).toEqual(1);
    });

    it('should display error message and not custom error message', function () {
      $rootScope.$broadcast('$stateChangeStart', {name: 'stateName'});
      $rootScope.$apply();
      StateChangeErrorHandler.hasStateError.and.returnValue(false);

      interceptor.responseError({
        config: {url: 'dummyFilterUri', method: 'GET'},
        data: {code: 99, message: 'some error'},
        status: 400
      });
      expect(AlertService.add).toHaveBeenCalledWith('danger', 'error default');
    });

  });

});


