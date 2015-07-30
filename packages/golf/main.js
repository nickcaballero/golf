// Helper function to remove object with a prompt
function basicRemove(collection, object, callback) {
    if (confirm('Are you sure?')) {
        collection.remove(object._id);
        if (_.isFunction(callback))
            callback(object);
        return true;
    }
    return false;
}

// helper function to save object
function basicSave(object, collection, callback) {
    var payload = _.omit(object, _.isFunction);
    if (object._id)
        collection.update(object._id, object);
    else
        collection.insert(payload);
    if (_.isFunction(callback))
        callback(object);
}

function getId($stateParams, param) {
    param = param || 'id';
    var id = ($stateParams[param] || '').trim();
    return id == 'new' ? null : (id || 'none');
}

function getFromCollection($stateParams, collection, fail, param) {
    var id = getId($stateParams, param);
    var data = id ? collection.findOne(id) : {};
    if (id && !data)
        return fail(id);
    return data
}

function getOrRedirect($stateParams, $state, collection, param, message, target) {
    return getFromCollection($stateParams, collection, function(id) {
        message(id);
        return;
    }, param);
}

// Helper function to get course from parameters
function getCourse($stateParams, $state, param) {
    return getOrRedirect($stateParams, $state, Courses, param, function(id) {
        alert('Course not found: ' + id);
        $state.go('courses');
    });
}

// Helper function to get submission from parameters
function getSubmission($stateParams, $state, param) {
    return getOrRedirect($stateParams, $state, Submissions, param, function(id) {
        alert('Submission not found: ' + id);
        $state.go('courses');
    });
}

function withCollectionObject(getter, fn, param) {
    return function($scope, $stateParams, $state) {
        var object = getter($stateParams, $state, param);
        if (!object)
            return;

        var args = Array.prototype.slice.call(arguments, 0);
        args.push(object);
        return fn.apply(this, args);
    };
}

function cleanupCourse(course) {
    Submissions.remove({
        courseId: course._id
    });
}

// Setup the application
var golfApp = angular.module('golfApp', [
    'angular-meteor', 'ui.bootstrap', 'ui.router', 'courseCtrls', 'ngSanitize', 'ui.ace'
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
    $scope.remove = function(course) {
        basicRemove(Courses, course, _.partial(cleanupCourse, course));
    };
}]);

// Edit and create the courses
courseCtrls.controller('CourseEdit', ['$scope', '$stateParams', '$state', withCollectionObject(getCourse, function($scope, $stateParams, $state, course) {
    var toCourses = function() {
        $state.go('courses');
    };

    $scope.course = course;
    $scope.validation = '';
    $scope.save = _.bind(basicSave, this, course, Courses, toCourses);
    $scope.remove = _.bind(basicRemove, this, Courses, course, _.wrap(toCourses, function(fn) {
        cleanupCourse(course);
        fn();
    }));

    var instance = makeMochaInstance();
    instance.setup({
        reporter: "json",
        ui: "bdd"
    });

    var api = instance.api;
    api.describe('Course runtime', function() {
        api.it('compiles', function() {
            var fn = new Function('bdd', 'chai', 'fn', course.runtime);
            chai.expect(fn).to.be.a('function');
        });
    });

    $scope.$watch(function() {
        return course.runtime;
    }, function() {
        instance.jsRun(function(js) {
            $scope.validation = js;
        });
    });
})]);

// Course view
courseCtrls.controller('CourseView', ['$scope', '$stateParams', '$state', withCollectionObject(getCourse, function($scope, $stateParams, $state, course) {
    $scope.course = course;
    $scope.submissions = $scope.$meteorCollection(function() {
        return Submissions.find({
            courseId: course._id
        });
    });
    $scope.submissions.forEach(function(submission) {
        try {
            submission.minified = (uglify.minify('function code() {' + submission.code + '};', {
                fromString: true
            }) || {}).code;
        }
        catch (e) {
            console.error(e);
        }
    });
    $scope.remove = _.partial(basicRemove, Submissions);
})]);

function getParameters(object, def) {
    return (object.parameters || (def || '')).trim().split(',');
}

// Edit and create the submissions
courseCtrls.controller('SubmissionEdit', ['$scope', '$stateParams', '$state',
    withCollectionObject(getCourse,
        withCollectionObject(getSubmission, function($scope, $stateParams, $state, course, submission) {
            var toCourse = function() {
                $state.go('courseView', {
                    id: course._id
                });
            };

            submission.courseId = course._id;

            $scope.course = course;
            $scope.submission = submission;
            $scope.save = _.bind(basicSave, this, submission, Submissions, toCourse);
            $scope.remove = _.bind(basicRemove, this, Submissions, submission, toCourse);

            function fnParams() {
                var params = getParameters(submission);
                return params.length ? params : getParameters(course, 'input');
            }

            function asFunction() {
                var params = fnParams();
                params.push(submission.code);
                return Function.apply({}, params);
            }

            var courseRuntime = new Function('bdd', 'chai', 'fn', course.runtime);

            $scope.$watchGroup([function() {
                return submission.code;
            }, function() {
                return submission.parameters;
            }, function() {
                return course.parameters;
            }], function() {
                var instance = makeMochaInstance();
                instance.setup({
                    reporter: "json",
                    ui: "bdd"
                });

                var api = instance.api;
                api.describe('Submission', function() {
                    api.it('is compatible', function() {
                        chai.expect(fnParams().length).to.be.equal(getParameters(course).length || 1)
                    });
                    api.it('compiles', function() {
                        var fn = asFunction();
                        chai.expect(fn).to.be.a('function');
                    });
                });

                try {
                    courseRuntime.call({}, instance.api, chai, asFunction());
                }
                catch (e) {
                    console.error(e);
                }

                instance.jsRun(function(js) {
                    $scope.$apply(function() {
                        $scope.validation = js;
                        console.log(js);
                    });
                });
            });
        }), 'courseId')
]);