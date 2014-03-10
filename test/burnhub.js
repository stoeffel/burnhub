var chai = require('chai'),
    should = chai.Should(),
    _ = require('lodash'),
    moment = require('moment'),
    Burnhub = require('../lib/burnhub');

chai.use(require('chai-fuzzy'));

describe('Burnhub', function() {
    it('should be a function', function() {
        Burnhub.should.be.a('function');
    });

    it('should be instancable', function() {
        (new Burnhub()).should.be.an('object');
    });

    it('should have a milestone, issues, start- and enddate, labelPrefix and an array pointsPerDay', function() {
        var config = {
            milestone: 'Sprint 1',
            issues: [{
                nr: 1
            }],
            startDate: new Date(),
            endDate: new Date(),
            labelPrefix: 'story-points-'
        },
            burnhub = new Burnhub(config);
        burnhub.should.be.have.property('milestone');
        burnhub.should.be.have.property('issues');
        burnhub.should.be.have.property('startDate');
        burnhub.should.be.have.property('endDate');
        burnhub.should.be.have.property('labelPrefix');
        burnhub.should.be.have.property('pointsPerDay');
    });

    describe('#getDaysInPeriod', function() {
        it('should fail if no start or end date', function() {
            var burnhub = new Burnhub();
            burnhub.getDaysInPeriod.should.
            throw (Error);
            burnhub = new Burnhub({
                startDate: moment()
            });
            burnhub.getDaysInPeriod.should.
            throw (Error);
            burnhub = new Burnhub({
                endDate: moment()
            });
            burnhub.getDaysInPeriod.should.
            throw (Error);
        });
        it('should return an array of all days in the given period', function() {
            var burnhub = new Burnhub({
                startDate: moment(),
                endDate: moment()
            });
            burnhub.getDaysInPeriod().should.be.an('array').with.length(1);
            burnhub = new Burnhub({
                startDate: moment(),
                endDate: moment().add(1, 'day')
            });
            burnhub.getDaysInPeriod().should.be.an('array').with.length(2);
            burnhub = new Burnhub({
                startDate: moment(),
                endDate: moment().add(2, 'day')
            });
            burnhub.getDaysInPeriod().should.be.an('array').with.length(3);
        });
    });

    describe('#getPointsForLabels', function() {
        it('should return 0 if no label with the prefix', function() {
            var labels = ['foo'],
                burnhub = new Burnhub({
                    labelPrefix: 'SP-',
                    issues: [{
                        labels: labels
                    }]
                });
            burnhub.getPointsForLabels(labels).should.be.equal(0);
        });
        it('should return the sum of the labels with the prefix', function() {
            var labels = ['SP-1', 'SP-2', 'foo-3', 'aSP-3', 'sp-2', 'SP-5'],
                burnhub = new Burnhub({
                    labelPrefix: 'SP-'
                });
            burnhub.getPointsForLabels(labels).should.be.equal(8);
        });
    });
    describe('#getPointsForADay', function() {
        it('should fail if no day is passed into the function', function() {
            var burnhub = new Burnhub();
            burnhub.getPointsForADay.should.
            throw (Error);
        });
        it('should return an object containing the totalpoints, remaining points and the date', function() {
            var burnhub = new Burnhub();
            burnhub.getPointsForADay(moment()).should.have.a.property('date');
            burnhub.getPointsForADay(moment()).should.have.a.property('totalPoints');
            burnhub.getPointsForADay(moment()).should.have.a.property('remaining');
        });
        it('should return an object containing the totalpoints, remaining points and the date', function() {
            var issues = [{
                closed_at: '03.18.2014',
                labels: [{
                    name: 'SP-1'
                }]
            }, {
                created_at: '03.18.2014',
                labels: [{
                    name: 'SP-1'
                }]
            }],
                burnhub = new Burnhub({
                    issues: issues,
                    labelPrefix: 'SP-'
                });
            burnhub.getPointsForADay(moment('03.18.14')).should.be.like({
                date: '03.18.2014',
                totalPoints: 1,
                remaining: 0
            });
        });
    });
    describe('#calculatePointsPerDay', function() {
        it('should return an array containing the points per each day and the augmentet ideal line', function() {
            var issues = [{
                closed_at: '03.18.2014',
                labels: [{
                    name: 'SP-1'
                }]
            }, {
                created_at: '03.18.2014',
                labels: [{
                    name: 'SP-1'
                }]
            }],
                burnhub = new Burnhub({
                    issues: issues,
                    labelPrefix: 'SP-',
                    startDate: moment('03.18.14'),
                    endDate: moment('03.18.14')
                });
            burnhub.calculatePointsPerDay().should.be.an('array').with.length(1);
        });
    });
});
