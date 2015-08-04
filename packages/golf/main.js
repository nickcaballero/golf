function opWrapper(callback, object) {
    return _.wrap(callback || lodash.noop, function(fn, error, _id) {
        if (error)
            alert('Failed to save');
        fn(object);
    });
}

// Helper function to remove object with a prompt
function basicRemove(collection, object, callback) {
    if (confirm('Are you sure?')) {
        collection.remove(object._id, opWrapper(callback, object));
        return true;
    }
    return false;
}

function asNamedFunction(name, submission, course) {
    return 'function code(' + fnParams(submission, course).join() + ") {\n" + submission.code + "\n}";
}

// helper function to save object
function basicSave(object, collection, callback) {
    callback = opWrapper(callback, object);

    var payload = _.omit(object, _.isFunction);
    if (object._id)
        collection.update(object._id, object, callback);
    else
        collection.insert(payload, callback);

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

function getParameters(object, def) {
    return (object.parameters || (def || '')).trim().split(',');
}

function fnParams(submission, course) {
    var params = getParameters(submission);
    return params.length ? params : getParameters(course, 'input');
}

function aceConfig(lines) {
    return {
        mode: 'javascript',
        theme: 'idle_fingers',
        advanced: {
            enableBasicAutocompletion: true,
            maxLines: lines || 20
        },
        onLoad: function(editor) {
            editor.$blockScrolling = Infinity;
        }
    };
}

function beautifyCode(code) {
    try {
        return beautify(code);
    }
    catch (e) {
        console.error(e);
    }
    return code;
}

var cacheBust = +new Date();
function testSubmission(submission, course, fn) {

    var jsWorker = new Worker('/resources/js/jsWorker.js?' + cacheBust);
    jsWorker.onerror = function(event) {
        throw new Error(event.message + " (" + event.filename + ":" + event.lineno + ")");
    };
    jsWorker.onmessage = function(e) {
        console.log("Received: " + e.data);
    }
    try {
        jsWorker.postMessage({
            command: 'run',
            course: course.runtime,
            submission: submission.code,
            parameters: fnParams(submission, course)
        });
    }
    catch (e) {
        // TODO Terminate
    }
}

Accounts.ui.config({
    passwordSignupFields: 'USERNAME_AND_EMAIL'
});

var courses = Meteor.subscribe('courses');
var submissions = Meteor.subscribe('submissions');

var generalCtrls = angular.module('generalCtrls', []);

generalCtrls.controller('Login', ['$scope', function($scope) {

}]);

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
    var toCourses = function(course) {
        if (course._id)
            $state.go('courseView', {
                id: course._id
            });
        else
            $state.go('courses');
    };

    $scope.aceConfig = aceConfig(Infinity);
    $scope.course = course;
    $scope.save = _.wrap(_.bind(basicSave, this, course, Courses, toCourses), function(fn) {
        course.runtime = beautifyCode(course.runtime);
        return fn();
    });
    $scope.remove = _.bind(basicRemove, this, Courses, course, _.wrap(toCourses, function(fn) {
        cleanupCourse(course);
        return fn();
    }));

    $scope.$watch(function() {
        return course.runtime;
    }, function() {
        
    });
})]);

courseCtrls.controller('CourseSubmissionTest', ['$scope', '$modalInstance', function($scope, $modalInstance) {
    $scope.ok = function() {
        $modalInstance.close();
    };
}]);

function isLoggedIn($scope) {
    return $scope.currentUser != null;
}

function loginPrompt() {
    $('#login-dropdown-list').addClass('open');
    $('html,body').animate({
        scrollTop: 0
    }, 'slow');
}

// Course view
courseCtrls.controller('CourseView', ['$scope', '$stateParams', '$state', '$modal', withCollectionObject(getCourse, function($scope, $stateParams, $state, $modal, course) {

    $scope.aceConfigWrap = _.extend(aceConfig(Infinity), {
        useWrapMode: true,
        showGutter: false
    });
    $scope.course = course;

    $scope.canEditCourse = _.partial(isLoggedIn, $scope);
    $scope.canEditSubmission = _.partial(isLoggedIn, $scope);
    $scope.loginPrompt = _.partial(_.defer, loginPrompt);

    $scope.toggleMode = function(submission) {
        var code = asNamedFunction('code', submission, course);
        switch (submission.displayMode) {
            case 'minified':
                submission.displayMode = 'code';
                submission.displayCode = beautifyCode(code);
                break;
            case 'code':
            default:
                submission.displayMode = 'minified';
                submission.displayCode = (uglify.minify(code, {
                    fromString: true
                }) || {}).code;
                break;
        }
    };

    $scope.modeLabel = function(submission) {
        return submission.displayMode == 'code' ? 'Show minified' : 'Show code';
    };

    $scope.testSubmission = function(submission) {
        if (!confirm('You trust it?'))
            return;

        testSubmission(submission, course, function(js) {
            $scope.$apply(function() {
                var childScope = $scope.$new(true, $scope);
                childScope.validation = js;
                childScope.submission = submission;
                $modal.open({
                    animation: false,
                    scope: childScope,
                    controller: 'CourseSubmissionTest',
                    templateUrl: 'courseView.testResults.html',
                });
            })
        });
    };

    $scope.submissions = $scope.$meteorCollection(function() {
        return Submissions.find({
            courseId: course._id
        });
    }, false);
    $scope.submissions.forEach(function(o) {
        o.displayMode = 'minified';
        $scope.toggleMode(o);
    });

    $scope.remove = _.partial(basicRemove, Submissions);
    $scope.fnParams = function(submission) {
        return fnParams(submission, course);
    };
})]);

// Edit and create the submissions
courseCtrls.controller('SubmissionEdit', ['$scope', '$stateParams', '$state', 'currentUser',
    withCollectionObject(getCourse,
        withCollectionObject(getSubmission, function($scope, $stateParams, $state, currentUser, course, submission) {
            var toCourse = function() {
                $state.go('courseView', {
                    id: course._id
                });
            };

            submission.courseId = course._id;

            $scope.aceConfig = aceConfig(Infinity);
            $scope.course = course;
            $scope.submission = submission;
            $scope.save = _.wrap(_.bind(basicSave, this, submission, Submissions, toCourse), function(fn) {
                submission.code = beautifyCode(submission.code);
                return fn();
            });
            $scope.remove = _.bind(basicRemove, this, Submissions, submission, toCourse);

            var courseRuntime = new Function('bdd', 'chai', 'fn', course.runtime);

            $scope.$watchGroup([function() {
                return submission.code;
            }, function() {
                return submission.parameters;
            }, function() {
                return course.parameters;
            }], function() {
                testSubmission(submission, course, function(js) {
                    $scope.$apply(function() {
                        $scope.validation = js;
                        $scope.submission.valid = !js.failures.length;
                    });
                });
            });
        }), 'courseId')
]);

// Setup the application
var golfApp = angular.module('golfApp', [
    'angular-meteor', 'ui.bootstrap', 'ui.router', 'courseCtrls', 'generalCtrls', 'ngSanitize', 'ui.ace'
]);


// Configure error handling
golfApp.run(["$rootScope", "$state", function($rootScope, $state) {
    $rootScope.$on("$stateChangeError", function(event, toState, toParams, fromState, fromParams, error) {
        if (error === "AUTH_REQUIRED")
            loginPrompt();
        else
            console.error('Failed to change state', arguments);
    });
}]);



// Configure router
golfApp.config(['$urlRouterProvider', '$stateProvider', '$locationProvider', '$provide',
    function($urlRouterProvider, $stateProvider, $locationProvider, $provide) {

        $provide.decorator('meteorIncludeDirective', function($delegate) {
            var directive = $delegate[0];
            return $delegate;
        });

        var authResolve = {
            "currentUser": ["$meteor", function($meteor) {
                return $meteor.requireUser();
            }]
        };

        $stateProvider.

        state('login', {
            url: '/login',
            templateUrl: 'partials/login.ng.html',
            controller: 'Login'
        }).

        state('courses', {
            url: '/courses',
            templateUrl: 'partials/course-list.ng.html',
            controller: 'CourseList'
        }).
        state('courseEdit', {
            url: '/courses/{id}/edit',
            templateUrl: 'partials/course-edit.ng.html',
            controller: 'CourseEdit',
            resolve: authResolve
        }).
        state('courseView', {
            url: '/courses/{id}',
            templateUrl: 'partials/course-view.ng.html',
            controller: 'CourseView'
        }).

        state('submissionEdit', {
            url: '/courses/{courseId}/submissions/{id}/edit',
            templateUrl: 'partials/submission-edit.ng.html',
            controller: 'SubmissionEdit',
            resolve: authResolve
        });

        $urlRouterProvider.otherwise('/courses');
    }
]);