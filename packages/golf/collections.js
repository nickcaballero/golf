this.Courses = new Mongo.Collection("courses");
this.Submissions = new Mongo.Collection("submissions");

Courses._publicSubscription = 'courses';
Courses.allow({
    insert: function(userId, doc) {
        return doc._id === undefined;
    }
});

Submissions._publicSubscription = 'submissions';