var Q = require('q'),
    github = require('octonode'),
    client = github.client(),
    me = module.exports;

me.getIssues = function(user, repo, milestone) {
    var q = Q.defer(),
        ghrepo = client.repo(user + '/' + repo);
    ghrepo.issues({
        state: 'all',
        milestone: milestone
    }, function(error, issues) {
        if (error) {
            q.reject(error);
        } else {
            q.resolve(issues);
        }
    });
    return q.promise;
};
