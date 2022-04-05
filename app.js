console.log('Hello World! says "app.js"');

const externalSourcePath = './employees.json';

const getEmployeesFromDatabase = async () => {
    const response = await fetch(externalSourcePath);
    const bodyOfResponse = await response.json();
    return bodyOfResponse;
}

let employees;

const init = async () => {
    console.time('Fetch Employees-Database');
    employees = await getEmployeesFromDatabase();
    console.timeEnd('Fetch Employees-Database');
    console.log(employees);
}

init();

const addEmployeeToDatabase = async (employee) => {
    const response = await fetch(externalSourcePath, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(employee)
    });
    return response;
}

const registerNewEmployee = async () => {
    const newEmployee = {
        "name": "Max",
        "age": 41,
        "married": true,
        "address": {
            "street": "Karl-Marx-Straße",
            "zipCode": "56789",
            "country": "DE",
            "city": "Gießheim"
        }
    };

    const response = await addEmployeeToDatabase(newEmployee);
    console.log(response);
}

// setTimeout that the console.logs dont get mixed
setTimeout(() => {
    registerNewEmployee();
}, 1000)