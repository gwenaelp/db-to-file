require('dotenv').config();

const socket = require('socket.io-client')(process.env.DATA_API_URL);
const filtr = require('filtr');
const mkdirp = require('mkdirp');
const fs = require('fs');
const jsonToEnv = require('json-to-env/lib/index');
const config = require(process.env.CONFIG_FILE);
const Handlebars = require('handlebars');

console.log(process.env.CONFIG_FILE, config);

// Add a connect listener
socket.on('connect', function(socket) {
  console.log('Connected!');
});

function checkRulesAndSync(doc, deleteDoc = false) {
  for (var i = 0; i < config.rules.length; i++) {
    const rule = config.rules[i];
    const query = filtr(rule.rule);
    if(query.test([doc]).length) {
      let destination = rule.destination.split('/');
      destination.pop();
      mkdirp.sync(destination.join('/'));
      if(rule.inArray === true) {
        let fileContent = [];
        try {
          fileContent = JSON.parse(fs.readFileSync(rule.destination));

          if(fileContent.length === undefined || fileContent.push === undefined) {
            fileContent = [];
          }

          let found = false;
          for (var j = 0; j < fileContent.length; j++) {
            if(fileContent[j]._id === doc._id) {
              if(deleteDoc) {
                fileContent.splice(j, 1);
              } else {
                fileContent[j] = doc;
              }
              found = true;
            }
          }
          if(!found) {
            fileContent.push(doc);
          }
        } catch(e) {
          if(!deleteDoc)
          fileContent.push(doc);
        }

        fs.writeFileSync(rule.destination, JSON.stringify(fileContent, null, 2));
      } else {
        if(deleteDoc) {
          fs.unlinkSync(rule.destination);
        } else {
          const destinationExtension = rule.destination.split('.').pop();
          let fileContent = doc;
          console.log('destinationExtension', destinationExtension);
          if(destinationExtension === 'env') {
            fileContent = jsonToEnv.build('', fileContent, '', {});
          } else {
            fileContent = JSON.stringify(fileContent, null, 2);
          }

          if(rule.key) {
            if(!doc[rule.key]) {
              return;
            } else {
              if(typeof doc[rule.key] === 'string') {
                fileContent = doc[rule.key];
              }
            }
          }
          
          const destinationTemplate = Handlebars.compile(rule.destination);
          fs.writeFileSync(destinationTemplate(doc), fileContent);
        }
      }
    }
  }
}

socket.on('connect', () => {
  console.log('connected');
  socket.on('created', (doc) => {
    console.log('created!', doc);
    checkRulesAndSync(doc);
  });
  socket.on('updated', (doc) => { 
    console.log('updated!', doc);
    checkRulesAndSync(doc);
  });
  socket.on('deleted', (doc) => { 
    console.log('deleted!', doc);
    checkRulesAndSync(doc);
  });
});