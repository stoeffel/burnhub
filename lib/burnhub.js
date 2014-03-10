var _ = require('lodash'),
    moment = require('moment'),
    Burnhub;

require('./StringExtras');

Burnhub = function(config) {
    this.pointsPerDay = [];
    this.totalPoints = 0;
    this.done = 0;
    _.assign(this, config);
    this.issues = _.filter(this.issues, this.isInMilestone(), this);
};

Burnhub.prototype.isInMilestone = function() {
    var me = this;
    return function(issue) {
        if (issue.milestone) {
            return issue.milestone.title === me.milestone;
        } else {
            return false;
        }
    };
};

Burnhub.prototype.getDaysInPeriod = function() {
    var days = [];
    if (!this.startDate ||  !this.endDate) {
        throw new Error('start and end date is needed');
    }
    for (var day = this.startDate; day.isBefore(this.endDate); day.add('days', 1)) {
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
            pointsPerDay.totalPoints += points;
        }
    }, this);
    pointsPerDay.remaining = pointsPerDay.totalPoints - this.done;
    this.totalPoints = pointsPerDay.totalPoints;
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
        item.ideal = Math.floor((1 - (key+1) / pointsPerDay.length) * item.totalPoints);
    });
    return pointsPerDay;
};

module.exports = Burnhub;
