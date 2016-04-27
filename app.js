var restify = require('restify');
var builder = require('botbuilder');

var server = restify.createServer();
var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;
var bot = new builder.BotConnectorBot();
bot.add('/', new builder.CommandDialog()
  .matches('^gen google oauth2?', builder.DialogAction.beginDialog('/google-oauth2'))
  .matches('^quit', builder.DialogAction.endDialog())
  .onDefault(function (session) {
    session.beginDialog('/google-oauth2');
  }));
bot.add('/google-oauth2',  [
  function (session) {
    builder.Prompts.text(session, "What is your CLIENT_ID?\n\
      You can get it from http://console.developers.google.com/\n\
      You should add "+process.env.GOOGLE_OAUTH2_REDIRECT+" to your host list");
  },
  function (session, results) {
    if (!results.response) return session.endDialog();
    session.userData.client_id = results.response
    builder.Prompts.text(session, "What is your CLIENT_SECRET?");
  },
  function (session, results) {
    if (!results.response) return session.endDialog();
    session.userData.client_secret = results.response
    builder.Prompts.text(session, "What scopes do you want?");
  },
  function (session, results) {
    if (!results.response) return session.endDialog();
    session.userData.scope = results.response.split(",");
    oauth2Client = new OAuth2(session.userData.client_id, session.userData.client_secret, process.env.GOOGLE_OAUTH2_REDIRECT);
    url = oauth2Client.generateAuthUrl({access_type: 'offline', scope: session.userData.scope});
    builder.Prompts.text(session, "Please go to "+url+" then parse your code here");
  },
  function (session, results) {
    if (!results.response) return session.endDialog();
    oauth2Client = new OAuth2(session.userData.client_id, session.userData.client_secret, process.env.GOOGLE_OAUTH2_REDIRECT);
    oauth2Client.getToken(results.response, function(err, tokens){
      if (err) {
        session.send('Error: %s', err);
      } else {
        text = ""
        for (key in tokens) {
          text += key + ": " + tokens[key] + "\n";
        }
        session.send(text);
      }
    });
  }
]);

server.use(restify.queryParser());
server.use(bot.verifyBotFramework({appId: process.env.BOTFRAMEWORK_APPID, appSecret: process.env.BOTFRAMEWORK_APPSECRET }));
server.post('/v1/messages', bot.listen());
server.get('/google/oauth2', function(req, res){
  res.send(req.query.code);
});
server.get('/keepalive', function(req, res){
  res.send("OK");
});

server.listen(process.env.port || 3978, function () {
  console.log('%s listening to %s', server.name, server.url);
});
