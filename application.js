var Customers = new Mongo.Collection("customers");

if (Meteor.isClient) {

  // Helper function to remove customer with a prompt
  function removeCustomer(customer) {
    if (confirm('Are you sure?')) {
      Customers.remove(customer._id);
      return true;
    }
  }

  // Setup the application
  var customerApp = angular.module('customerApp', [
    'angular-meteor', 'ui.router', 'customerCtrls'
  ]);

  // Configure router
  customerApp.config(['$urlRouterProvider', '$stateProvider', '$locationProvider',
    function($urlRouterProvider, $stateProvider, $locationProvider) {
      $stateProvider.

      state('customers', {
        url: '/customers',
        templateUrl: 'partials/customer-list.ng.html',
        controller: 'CustomerList'
      }).

      state('customerView', {
        url: '/customers/{id}',
        templateUrl: 'partials/customer-view.ng.html',
        controller: 'CustomerView'
      });

      $urlRouterProvider.otherwise('/customers');
    }
  ]);

  var customerCtrls = angular.module('customerCtrls', []);

  // List the customers
  customerCtrls.controller('CustomerList', ['$scope', '$meteor', function($scope, $meteor) {
    $scope.customers = $meteor.collection(Customers);
    $scope.remove = removeCustomer;
  }]);

  // Edit and create the customers
  customerCtrls.controller('CustomerView', ['$scope', '$meteor', '$stateParams', '$state', function($scope, $meteor, $stateParams, $state) {
    var id = $stateParams.id;
    id = id == 'new' ? null : id;
    
    // Load customer if an ID was provided
    var customer = id ? Customers.findOne(id) : {};
    if (id && !customer) {
      alert('Customer not found: ' + id);
      $state.go('customers');
      return;
    }

    $scope.customer = customer;
    
    // Name formatter
    customer.customerName = function() {
      return [this.firstName, this.lastName].join(' ').trim() || 'Enter name';
    }

    // Remove customer
    $scope.remove = function() {
      if (removeCustomer(customer))
        $state.go('customers');
    };

    // Save customer
    $scope.save = function() {
      var payload = _.omit(customer, _.isFunction);
      if (customer._id)
        Customers.update(customer._id, customer);
      else
        Customers.insert(payload);
      $state.go('customers');
    };
  }]);
}

if (Meteor.isServer) {
  Meteor.startup(function() {
    // code to run on server at startup
  });
}
