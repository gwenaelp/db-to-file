require('dotenv').config();

const socket = require('socket.io-client')(process.env.DATA_API_URL);
const filtr = require('filtr');
const mkdirp = require('mkdirp');
const fs = require('fs');
const jsonToEnv = require('json-to-env/lib/index');
const config = require(process.env.CONFIG_FILE);

// Add a connect listener
socket.on('connect', function(socket) {
  console.log('Connected!');
});

function checkRulesAndSync(doc, deleteDoc = false) {
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

        fs.writeFileSync(config.rules[i].destination, JSON.stringify(fileContent, null, 2));
      } else {
        if(deleteDoc) {
          fs.unlinkSync(config.rules[i].destination);
        } else {
          const destinationExtension = config.rules[i].destination.split('.').pop();
          let fileContent = doc;
          if(destinationExtension === 'env') {
            fileContent = jsonToEnv.build('', fileContent, '', {});
          } else {
            fileContent = JSON.stringify(fileContent, null, 2);
          }

          fs.writeFileSync(config.rules[i].destination, fileContent);
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