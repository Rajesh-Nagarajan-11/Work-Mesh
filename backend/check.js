const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/workmesh');
const Project = require('./src/models/Project');
Project.findById('69a94c6370383d8d18804f09').lean().then(p => { 
  console.log(JSON.stringify(p.requiredSkills, null, 2)); 
  process.exit(0); 
})
