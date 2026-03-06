const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/workmesh');
const Employee = require('./src/models/Employee');
const EmployeeSkill = require('./src/models/EmployeeSkill');

Employee.findOne({ name: 'Admin User' }).then(emp => {
  if(!emp) return console.log("Not found");
  EmployeeSkill.find({ emp_id: emp._id }).lean().then(skills => {
    console.log("Admin Skills:");
    console.log(JSON.stringify(skills, null, 2));
    process.exit(0);
  });
})
