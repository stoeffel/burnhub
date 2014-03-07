var github = require('octonode'),
    winston = require('winston'),
    _ = require('lodash'),
    Q = require('q'),
    inquirer = require('inquirer'),
    client = github.client(),
    me = module.exports,
    user, repo, milestone, prefix, totalPoints, donePoints, todoPoints, issues;

require('./lib/StringExtras');

me.getIssues = function() {
    var q = Q.defer(),
        ghrepo = client.repo(user + '/' + repo);
    ghrepo.issues({
        state: 'all'
    }, function(error, issues) {
        if (error) {
            q.reject(error);
        } else {
            q.resolve(issues);
        }
    });
    return q.promise;
};

me.onReceivedIssues = function(receivedIssues) {
    issues = _.filter(receivedIssues, me.isInMilestone());
    issues = _.filter(issues, me.hasStorypointLabel());
    me.calculatePoints();
    winston.info('Milestone:', milestone);
    winston.info('Total:', totalPoints);
    winston.info('Done:', donePoints);
    winston.info('Open:', todoPoints);
};

me.isInMilestone = function() {
    return function(issue) {
        if (issue.milestone) {
            return issue.milestone.title === milestone;
        } else {
            return false;
        }
    };
};

me.hasStorypointLabel = function() {
    return function(issue) {
        if (issue.labels) {
            issue.labels = _.filter(issue.labels, function(label) {
                return label.name.startsWith(prefix);
            });
            return issue.labels.length > 0;
        } else {
            return false;
        }
    };
};

me.calculatePoints = function() {
    totalPoints = 0;
    donePoints = 0;
    todoPoints = 0;
    _.forEach(issues, function(issue) {
        _.forEach(issue.labels, function(label) {
            var points = parseInt(label.name.replace(prefix, ''));
            totalPoints += points;
            if (issue.state === 'closed') {
                donePoints += points;
            } else {
                todoPoints += points;
            }
        });
    });
};

me.onFail = function(error) {
    console.error(error);
};

me.askForUserAndRepo = function() {
    inquirer.prompt([{
            type: 'input',
            name: 'user',
            message: 'Enter the name of the repo owner',
            default: 'heinzelmannchen'
        }, {
            type: 'input',
            name: 'repo',
            message: 'Enter a repo of the user',
            default: 'BA-Stuff'
        }, {
            type: 'input',
            name: 'milestone',
            message: 'Enter the name of a milestone',
            default: 'Sprintgoal 2'
        }, {
            type: 'input',
            name: 'prefix',
            message: 'Enter the prefix for the storypoints label',
            default: 'story-points-'
        }],
        function(answers) {
            user = answers.user;
            repo = answers.repo;
            milestone = answers.milestone;
            prefix = answers.prefix;
            me.getIssues()
                .then(me.onReceivedIssues)
                .fail(me.onFail);
        }
    );
};

me.start = function() {
    winston.cli();
    me.askForUserAndRepo();
};

me.start();
