require('dotenv').config();
console.log('connecting to', process.env.DATA_API_URL);

const socket = require('socket.io-client')(process.env.DATA_API_URL);
const filtr = require('filtr');
const mkdirp = require('mkdirp');
const fs = require('fs');

// Add a connect listener
socket.on('connect', function(socket) {
  console.log('Connected!');
});

const config = {
  rules: [{
    collection: 'server-api-redirects',
    rule: {},
    destination: '/home/gwen/sources/testDbToFile/a.json',
    inArray: true
  }, {
    collection: 'server-api-redirects',
    rule: { route: 'mercutio' },
    destination: '/home/gwen/sources/testDbToFile/mercutio.json'
  }]
};

function checkRulesAndSync(doc) {
  for (var i = 0; i < config.rules.length; i++) {
    const query = filtr(config.rules[i].rule);
    if(query.test([doc]).length) {
      let destination = config.rules[i].destination.split('/');
      destination.pop();
      mkdirp.sync(destination.join('/'));
      if(config.rules[i].inArray === true) {
        let fileContent = [];
        try {
          fileContent = JSON.parse(fs.readFileSync(config.rules[i].destination));

          if(fileContent.length === undefined || fileContent.push === undefined) {
            fileContent = [];
          }

          let found = false;
          for (var j = 0; j < fileContent.length; j++) {
            if(fileContent[j]._id === doc._id) {
              fileContent[j] = doc;
              found = true;
            }
          }
          if(!found) {
            fileContent.push(doc);
          }
        } catch(e) {
          fileContent.push(doc);
        }
        fs.writeFileSync(config.rules[i].destination, JSON.stringify(fileContent, null, 2));
      } else {
        fs.writeFileSync(config.rules[i].destination, JSON.stringify(doc, null, 2));
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
  });
});