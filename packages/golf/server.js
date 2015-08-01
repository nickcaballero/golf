Meteor.publish("courses", function() {
    return Courses.find({});
});
Meteor.publish("submissions", function() {
    return Submissions.find({});
});

ServiceConfiguration.configurations.upsert({
    service: "google"
}, {
    $set: {
        clientId: "248123391306-8baf3rn8ce3v1sk01rsia9mitcputfsv.apps.googleusercontent.com",
        secret: "QSvTQplAZ6yjXIgHFKJq7_J2"
    }
});