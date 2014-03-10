var github = require('octonode'),
    Q = require('q'),
    client = github.client(),
    me = module.exports;

me.getIssues = function(user, repo) {
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
