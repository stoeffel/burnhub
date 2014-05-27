var _ = require('lodash'),
    moment = require('moment'),
    github = require('./githubAdapter'),
    Burnhub;

require('./StringExtras');

Burnhub = function(config) {
    this.pointsPerDay = [];
    this.totalPoints = 0;
    this.issuesCreatedBeforeSprint = [];
    this.done = 0;
    _.assign(this, config);
};

Burnhub.prototype.getDaysInPeriod = function() {
    var days = [];
    if (!this.startDate ||  !this.endDate) {
        throw new Error('start and end date is needed');
    }
    for (var day = moment(this.startDate.format('YYYY-MM-DD')); day.isBefore(this.endDate); day.add('days', 1)) {
        days.push(moment(day.format()));
    }
    days.push(moment(this.endDate.format()));
    return days;
};

Burnhub.prototype.getPointsForLabels = function(labels) {
    var points = 0;
    _.forEach(labels, function(label) {
        if (this.isStoryLabel(label)) {
            points = points + this.getPointsFromLabel(label);
        }
    }, this);
    return points;
};

Burnhub.prototype.isStoryLabel = function(label) {
    return label.startsWith(this.labelPrefix);
};

Burnhub.prototype.getPointsFromLabel = function(label) {
    return parseInt(label.replace(this.labelPrefix, ''));
};

Burnhub.prototype.getPointsForADay = function(day) {
    var pointsPerDay = {
        date: day.format('MM.DD.YYYY'),
        totalPoints: this.totalPoints,
        remaining: 0
    };

    _.forEach(this.issues, function(issue) {
        var points = this.getPointsForLabels(_.map(issue.labels, 'name'));
        if (moment(issue.closed_at).format('MM.DD.YYYY') === day.format('MM.DD.YYYY')) {
            this.done += points;
        }
        if (moment(issue.created_at).format('MM.DD.YYYY') === day.format('MM.DD.YYYY')) {
            this.totalPoints += points;
        }
        if (moment(issue.created_at).isBefore(this.startDate)) {
            if (!_.contains(this.issuesCreatedBeforeSprint, issue.id)) {
                this.issuesCreatedBeforeSprint.push(issue.id);
                this.totalPoints += points;
            }
        }
    }, this);
    pointsPerDay.remaining = this.totalPoints - this.done;
    pointsPerDay.totalPoints = this.totalPoints;
    return pointsPerDay;
};


Burnhub.prototype.calculatePointsPerDay = function() {
    var days = this.getDaysInPeriod(),
        pointsPerDay = [];

    _.forEach(days, function(day) {
        pointsPerDay.push(this.getPointsForADay(day));
    }, this);


    pointsPerDay = this.augmentIdealPoints(pointsPerDay);
    return pointsPerDay;
};

Burnhub.prototype.augmentIdealPoints = function(pointsPerDay) {
    _.forEach(pointsPerDay, function(item, key) {
        item.ideal = Math.floor((1 - (key + 1) / pointsPerDay.length) * item.totalPoints);
    });
    return pointsPerDay;
};

Burnhub.getIssues = github.getIssues;


module.exports = Burnhub;
