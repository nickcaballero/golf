// Helper function to remove course with a prompt
function removeCourse(course) {
    if (confirm('Are you sure?')) {
        Courses.remove(course._id);
        return true;
    }
}

function getId($stateParams, param) {
    param = param || 'id';
    var id = $stateParams[param];
    return id == 'new' ? null : id;
}

// Helper function to get course from parameters
function getCourse($stateParams, $state, param) {
    var id = getId($stateParams, param);

    // Load course if an ID was provided
    var course = id ? Courses.findOne(id) : {};
    if (id && !course) {
        alert('Course not found: ' + id);
        $state.go('courses');
        return;
    }

    return course;
}

function withCourseParameter(fn, param) {
    return function($scope, $stateParams, $state) {
        var course = $scope.course = getCourse($stateParams, $state, param);
        if (!course)
            return;

        var args = Array.prototype.slice.call(arguments, 0);
        args.push(course);
        return fn.apply(this, args);
    };
}

// Setup the application
var golfApp = angular.module('golfApp', [
    'angular-meteor', 'ui.router', 'courseCtrls', 'ngSanitize', 'ui.ace'
]);

// Configure router
golfApp.config(['$urlRouterProvider', '$stateProvider', '$locationProvider',
    function($urlRouterProvider, $stateProvider, $locationProvider) {
        $stateProvider.

        state('courses', {
            url: '/courses',
            templateUrl: 'partials/course-list.ng.html',
            controller: 'CourseList'
        }).
        state('courseEdit', {
            url: '/courses/{id}/edit',
            templateUrl: 'partials/course-edit.ng.html',
            controller: 'CourseEdit'
        }).
        state('courseView', {
            url: '/courses/{id}',
            templateUrl: 'partials/course-view.ng.html',
            controller: 'CourseView'
        }).

        state('submissionEdit', {
            url: '/courses/{courseId}/submissions/{id}/edit',
            templateUrl: 'partials/submission-edit.ng.html',
            controller: 'SubmissionEdit'
        });

        $urlRouterProvider.otherwise('/courses');
    }
]);

var courseCtrls = angular.module('courseCtrls', []);

// List the courses
courseCtrls.controller('CourseList', ['$scope', function($scope) {
    $scope.courses = $scope.$meteorCollection(Courses);
    $scope.remove = removeCourse;
}]);

// Edit and create the courses
courseCtrls.controller('CourseEdit', ['$scope', '$stateParams', '$state', withCourseParameter(function($scope, $stateParams, $state, course) {

    // Remove course
    $scope.remove = function() {
        if (removeCourse(course))
            $state.go('courses');
    };

    // Save course
    $scope.save = function() {
        var payload = _.omit(course, _.isFunction);
        if (course._id)
            Courses.update(course._id, course);
        else
            Courses.insert(payload);
        $state.go('courses');
    };
})]);

// Course view
courseCtrls.controller('CourseView', ['$scope', '$stateParams', '$state', withCourseParameter(function($scope, $stateParams, $state, course) {
    $scope.submissions = $scope.$meteorCollection(function() {
        return Submissions.find({
            courseId: course._id
        });
    });
})]);

// Edit and create the submissions
courseCtrls.controller('SubmissionEdit', ['$scope', '$stateParams', '$state', withCourseParameter(function($scope, $stateParams, $state, course) {

}, 'courseId')]);